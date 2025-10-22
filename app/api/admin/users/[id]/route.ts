import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Ensure Node.js runtime for google-spreadsheet
export const runtime = 'nodejs';

const BASE_HEADERS = ['ID', 'Username', 'Password', 'Name', 'Role', 'Email', 'Status', 'CreatedAt'];
const REVIEWER_HEADERS = ['Expertise', 'CVLink', 'Organization', 'YearsExperience', 'LinkedInURL', 'GitHubIDs', 'OtherCircle', 'MattermostId'];

const initializeGoogleSheets = async () => {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (!SHEET_ID || !EMAIL || !KEY) {
    throw new Error('Google Sheets environment variables not configured');
  }

  const serviceAccountAuth = new JWT({
    email: EMAIL,
    key: KEY.replace(/\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
};

const getUsersSheet = async (doc: GoogleSpreadsheet) => {
  let sheet = doc.sheetsByTitle['Users'];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: 'Users',
      headerValues: [...BASE_HEADERS, ...REVIEWER_HEADERS, 'UpdatedAt']
    });
  } else {
    // Load header row before inspecting headerValues
    await sheet.loadHeaderRow();
    const existingHeaders = sheet.headerValues ?? [];
    // Ensure all expected columns exist
    const desiredHeaders = Array.from(new Set([
      ...existingHeaders,
      ...BASE_HEADERS,
      ...REVIEWER_HEADERS,
      'UpdatedAt'
    ]));
    const needsUpdate = desiredHeaders.length !== existingHeaders.length || desiredHeaders.some(h => !existingHeaders.includes(h));
    if (needsUpdate) {
      await sheet.setHeaderRow(desiredHeaders);
      await sheet.loadHeaderRow();
    }
  }
  return sheet;
};

// PUT /api/admin/users/:id
export async function PUT(req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    const { username, password, name, role, email, status } = body ?? {};

    const doc = await initializeGoogleSheets();
    const sheet = await getUsersSheet(doc);

    const rows = await sheet.getRows();
    const row = rows.find((r: any) => r.get('ID') === id);
    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const nowISO = new Date().toISOString();

    // Base fields
    if (username !== undefined) row.set('Username', username);
    if (password !== undefined) row.set('Password', password);
    if (name !== undefined) row.set('Name', name);
    if (role !== undefined) row.set('Role', role);
    if (email !== undefined) row.set('Email', email || '');
    if (status !== undefined) row.set('Status', status || 'active');

    // Reviewer-specific
    const effectiveRole = role ?? (row.get('Role') || '');
    if (effectiveRole === 'reviewer') {
      const {
        expertise = row.get('Expertise') || '',
        cvLink = row.get('CVLink') || '',
        organization = row.get('Organization') || '',
        yearsExperience = row.get('YearsExperience') || '',
        linkedinUrl = row.get('LinkedInURL') || '',
        githubIds = row.get('GitHubIDs') || '',
        mattermostId = row.get('MattermostId') || '',
        otherCircle = (row.get('OtherCircle') || 'No')
      } = body ?? {};

      row.set('Expertise', expertise);
      row.set('CVLink', cvLink);
      row.set('Organization', organization);
      row.set('YearsExperience', yearsExperience);
      row.set('LinkedInURL', linkedinUrl);
      row.set('GitHubIDs', githubIds);
      row.set('MattermostId', mattermostId);
      row.set('OtherCircle', typeof otherCircle === 'boolean' ? (otherCircle ? 'Yes' : 'No') : otherCircle);
    } else {
      // Clear reviewer-only fields if role changed away from reviewer
      row.set('Expertise', '');
      row.set('CVLink', '');
      row.set('Organization', '');
      row.set('YearsExperience', '');
      row.set('LinkedInURL', '');
      row.set('GitHubIDs', '');
      row.set('MattermostId', '');
      row.set('OtherCircle', 'No');
    }

    // Optionally track updates
    row.set('UpdatedAt', nowISO);

    await row.save();

    const updatedRole = row.get('Role') || '';
    const base: any = {
      id: row.get('ID'),
      username: row.get('Username'),
      name: row.get('Name'),
      role: updatedRole,
      email: row.get('Email') || '',
      status: row.get('Status') || 'active',
      createdAt: row.get('CreatedAt') || '',
      updatedAt: row.get('UpdatedAt') || ''
    };

    if (updatedRole === 'reviewer') {
      base.expertise = row.get('Expertise') || '';
      base.cvLink = row.get('CVLink') || '';
      base.organization = row.get('Organization') || '';
      base.yearsExperience = row.get('YearsExperience') || '';
      base.linkedinUrl = row.get('LinkedInURL') || '';
      base.githubIds = row.get('GitHubIDs') || '';
      base.mattermostId = row.get('MattermostId') || '';
      base.otherCircle = (row.get('OtherCircle') || 'No') === 'Yes';
    }

    return NextResponse.json({ message: 'User updated successfully', user: base });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users/:id
export async function DELETE(_req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const doc = await initializeGoogleSheets();
    const sheet = await getUsersSheet(doc);

    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex((r: any) => r.get('ID') === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await rows[rowIndex].delete();
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}