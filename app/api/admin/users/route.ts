import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Initialize auth with JWT
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const BASE_HEADERS = ['ID', 'Username', 'Password', 'Name', 'Role', 'Email', 'Status', 'CreatedAt'];
const REVIEWER_HEADERS = ['Expertise', 'CVLink', 'Organization', 'YearsExperience', 'LinkedInURL', 'GitHubIDs', 'OtherCircle', 'MattermostId'];

async function getOrCreateUsersSheet(doc: GoogleSpreadsheet) {
  let usersSheet = doc.sheetsByTitle['Users'];
  if (!usersSheet) {
    usersSheet = await doc.addSheet({
      title: 'Users',
      headerValues: [...BASE_HEADERS, ...REVIEWER_HEADERS, 'UpdatedAt']
    });
  } else {
    // Load current header row before reading headerValues
    await usersSheet.loadHeaderRow();
    const existingHeaders = usersSheet.headerValues ?? [];
    // Ensure ALL expected columns exist (base + reviewer + UpdatedAt)
    const desiredHeaders = Array.from(new Set([
      ...existingHeaders,
      ...BASE_HEADERS,
      ...REVIEWER_HEADERS,
      'UpdatedAt'
    ]));
    // Only rewrite if there's a change
    const needsUpdate = desiredHeaders.length !== existingHeaders.length || desiredHeaders.some(h => !existingHeaders.includes(h));
    if (needsUpdate) {
      await usersSheet.setHeaderRow(desiredHeaders);
      await usersSheet.loadHeaderRow();
    }
  }
  return usersSheet;
}

function parseBoolean(val: any): boolean {
  const s = String(val || '').trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'y';
}

export async function GET(request: NextRequest) {
  try {
    // Initialize the sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();

    // Get or create Users sheet
    const usersSheet = await getOrCreateUsersSheet(doc);

    // Get all rows
    const rows = await usersSheet.getRows();
    
    // Map rows to user objects (excluding passwords for security)
    const users = rows.map(row => {
      const role = row.get('Role') || '';
      const base = {
        id: row.get('ID') || '',
        username: row.get('Username') || '',
        name: row.get('Name') || '',
        role,
        email: row.get('Email') || '',
        status: row.get('Status') || 'active',
        createdAt: row.get('CreatedAt') || ''
      };

      if (role === 'reviewer') {
        return {
          ...base,
          expertise: row.get('Expertise') || '',
          cvLink: row.get('CVLink') || '',
          organization: row.get('Organization') || '',
          yearsExperience: row.get('YearsExperience') || '',
          linkedinUrl: row.get('LinkedInURL') || '',
          githubIds: row.get('GitHubIDs') || '',
          mattermostId: row.get('MattermostId') || '',
          otherCircle: parseBoolean(row.get('OtherCircle'))
        };
      }
      return base;
    });

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
    const body = await request.json();
    const { username, password, name, role, email } = body;

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
    const usersSheet = await getOrCreateUsersSheet(doc);

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
    
    // Prepare row data
    const rowData: Record<string, any> = {
      'ID': userId,
      'Username': username,
      'Password': password,
      'Name': name,
      'Role': role,
      'Email': email || '',
      'Status': 'active',
      'CreatedAt': new Date().toISOString()
    };

    if (role === 'reviewer') {
      const {
        expertise = '',
        cvLink = '',
        organization = '',
        yearsExperience = '',
        linkedinUrl = '',
        githubIds = '',
        mattermostId = '',
        otherCircle = false
      } = body;

      rowData['Expertise'] = expertise;
      rowData['CVLink'] = cvLink;
      rowData['Organization'] = organization;
      rowData['YearsExperience'] = yearsExperience;
      rowData['LinkedInURL'] = linkedinUrl;
      rowData['GitHubIDs'] = githubIds;
      rowData['MattermostId'] = mattermostId;
      rowData['OtherCircle'] = otherCircle ? 'Yes' : 'No';
    }
    
    // Add new user
    await usersSheet.addRow(rowData);

    const responseData: any = {
      id: userId,
      username,
      name,
      role,
      email: email || '',
      status: 'active'
    };

    if (role === 'reviewer') {
      responseData.expertise = rowData['Expertise'] || '';
      responseData.cvLink = rowData['CVLink'] || '';
      responseData.organization = rowData['Organization'] || '';
      responseData.yearsExperience = rowData['YearsExperience'] || '';
      responseData.linkedinUrl = rowData['LinkedInURL'] || '';
      responseData.githubIds = rowData['GitHubIDs'] || '';
      responseData.mattermostId = rowData['MattermostId'] || '';
      responseData.otherCircle = rowData['OtherCircle'] === 'Yes';
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create user' },
      { status: 500 }
    );
  }
}