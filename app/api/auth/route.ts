import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { User } from '@/app/types/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Check if environment variables are set
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn('Google Sheets environment variables not set. Falling back to local authentication.');
      // Fall back to local authentication
      const { authenticateUser } = await import('@/app/data/users');
      const user = authenticateUser(username, password);
      
      if (user) {
        return NextResponse.json({
          success: true,
          message: 'Authentication successful',
          user
        });
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid username or password' },
          { status: 401 }
        );
      }
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
      row.get('Username') === username && 
      row.get('Password') === password
    );
    
    if (userRow) {
      // User found, create user object
      const user: User = {
        id: userRow.get('ID'),
        username: userRow.get('Username'),
        name: userRow.get('Name'),
        role: userRow.get('Role') as 'admin' | 'reviewer' | 'coordinator',
      };
      
      return NextResponse.json({
        success: true,
        message: 'Authentication successful',
        user
      });
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