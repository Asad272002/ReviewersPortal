import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Initialize auth with JWT
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export async function GET(request: NextRequest) {
  try {
    // Initialize the sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();

    // Get or create Users sheet
    let usersSheet = doc.sheetsByTitle['Users'];
    if (!usersSheet) {
      usersSheet = await doc.addSheet({
        title: 'Users',
        headerValues: ['ID', 'Username', 'Password', 'Name', 'Role', 'Email', 'Status', 'CreatedAt']
      });
    }

    // Get all rows
    const rows = await usersSheet.getRows();
    
    // Map rows to user objects (excluding passwords for security)
    const users = rows.map(row => ({
      id: row.get('ID') || '',
      username: row.get('Username') || '',
      name: row.get('Name') || '',
      role: row.get('Role') || '',
      email: row.get('Email') || '',
      status: row.get('Status') || 'active',
      createdAt: row.get('CreatedAt') || ''
    }));

    return NextResponse.json({
      success: true,
      data: {
        users
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, role, email } = await request.json();

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'Username, password, name, and role are required' },
        { status: 400 }
      );
    }

    // Initialize the sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();

    // Get Users sheet
    let usersSheet = doc.sheetsByTitle['Users'];
    if (!usersSheet) {
      usersSheet = await doc.addSheet({
        title: 'Users',
        headerValues: ['ID', 'Username', 'Password', 'Name', 'Role', 'Email', 'Status', 'CreatedAt']
      });
    }

    // Check if user already exists
    const rows = await usersSheet.getRows();
    const existingUser = rows.find(row => row.get('Username') === username);
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this username already exists' },
        { status: 400 }
      );
    }

    // Generate unique ID
    const userId = `user_${Date.now()}`;
    
    // Add new user
    await usersSheet.addRow({
      'ID': userId,
      'Username': username,
      'Password': password,
      'Name': name,
      'Role': role,
      'Email': email || '',
      'Status': 'active',
      'CreatedAt': new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: {
        id: userId,
        username,
        name,
        role,
        email: email || '',
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create user' },
      { status: 500 }
    );
  }
}