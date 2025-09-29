import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { SignJWT } from 'jose';
import { User } from '@/app/types/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    // Trim whitespace from username to fix login issues
    const trimmedUsername = username?.trim();
    
    // Validate required fields
    if (!trimmedUsername || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Check if environment variables are set
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Google Sheets environment variables not set.');
      return NextResponse.json(
        { success: false, message: 'Authentication service not configured' },
        { status: 500 }
      );
    }
    
    // Initialize authentication with JWT
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Initialize the Google Sheet with authentication
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Get the Users sheet (assuming it's the second sheet, index 1)
    const usersSheet = doc.sheetsByTitle['Users'];
    if (!usersSheet) {
      console.error('Users sheet not found in the Google Sheet');
      return NextResponse.json(
        { success: false, message: 'Authentication service misconfigured' },
        { status: 500 }
      );
    }
    
    // Get all rows from the Users sheet
    const rows = await usersSheet.getRows();
    
    // Find the user with matching username and password
    const userRow = rows.find(row => 
      row.get('Username') === trimmedUsername && 
      row.get('Password') === password
    );
    
    if (userRow) {
      // User found, create user object
      const userRole = userRow.get('Role');
      // Normalize reviewer roles (merge "Reviewer" and "reviewer" into "reviewer")
      const normalizedRole = userRole.toLowerCase() === 'reviewer' ? 'reviewer' : userRole;
      
      const user: User = {
        id: userRow.get('ID'),
        username: userRow.get('Username'),
        name: userRow.get('Name'),
        role: normalizedRole as 'admin' | 'reviewer' | 'team_leader',
      };
      
      // Create JWT token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
      const token = await new SignJWT({ 
        userId: user.id, 
        username: user.username, 
        role: normalizedRole 
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);
      
      // Create response with user data
      const response = NextResponse.json({
        success: true,
        message: 'Authentication successful',
        user
      });
      
      // Set HTTP-only cookie with the token
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
      });
      
      return response;
    } else {
      // User not found or password incorrect
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Error during Google Sheets authentication:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}