import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function getFirst(row: any, keys: string[]): any {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).length > 0) return v;
  }
  return undefined;
}

function normalizeRole(roleRaw: any): 'admin' | 'reviewer' | 'team_leader' {
  const roleNorm = String(roleRaw || '')
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (roleNorm === 'admin') return 'admin';
  if (roleNorm === 'team_leader') return 'team_leader';
  return 'reviewer';
}

function toUser(row: any) {
  const role = normalizeRole(getFirst(row, ['role', 'Role', 'user_role', 'userRole']));
  const base: any = {
    id: getFirst(row, ['id', 'ID', 'user_id', 'userId']) || '',
    username: getFirst(row, ['username', 'user_name', 'Username', 'User Name']) || '',
    name: getFirst(row, ['name', 'Name', 'full_name', 'Full Name', 'displayName']) || '',
    role,
    email: getFirst(row, ['email', 'Email']) || '',
    status: getFirst(row, ['status', 'Status']) || 'active',
    createdAt: getFirst(row, ['createdAt', 'CreatedAt', 'created_at']) || ''
  };

  if (role === 'reviewer') {
    base.expertise = getFirst(row, ['expertise', 'Expertise']) || '';
    base.cvLink = getFirst(row, ['cvLink', 'CVLink']) || '';
    base.organization = getFirst(row, ['organization', 'Organization']) || '';
    base.yearsExperience = getFirst(row, ['yearsExperience', 'YearsExperience']) || '';
    base.linkedinUrl = getFirst(row, ['linkedinUrl', 'LinkedInURL']) || '';
    base.githubIds = getFirst(row, ['githubIds', 'GitHubIDs']) || '';
    base.mattermostId = getFirst(row, ['mattermostId', 'MattermostId']) || '';
    base.otherCircle = String(getFirst(row, ['otherCircle', 'OtherCircle'] || ''))
      .trim()
      .toLowerCase() === 'yes';
  }
  return base;
}

export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_app')
      .select('*')
      .limit(2000);

    if (error) {
      console.error('Supabase users select error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    const users = (data || []).map(toUser);

    return NextResponse.json({ success: true, data: { users } });
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
    const { username, password, name, role, email } = body || {};

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'Username, password, name, and role are required' },
        { status: 400 }
      );
    }

    const userId = `user_${Date.now()}`;
    const nowISO = new Date().toISOString();
    const normalizedRole = normalizeRole(role);

    // Align insert keys with Supabase column names for user_app
    const row: Record<string, any> = {
      ID: userId,
      Username: username,
      Password: password,
      Name: name,
      Role: normalizedRole,
      Email: email || '',
      Status: 'active',
      CreatedAt: nowISO,
      UpdatedAt: nowISO,
    };

    if (normalizedRole === 'reviewer') {
      row.Expertise = body?.expertise ?? '';
      row.CVLink = body?.cvLink ?? '';
      row.Organization = body?.organization ?? '';
      row.YearsExperience = body?.yearsExperience ?? '';
      row.LinkedInURL = body?.linkedinUrl ?? '';
      row.GitHubIDs = body?.githubIds ?? '';
      row.MattermostId = body?.mattermostId ?? '';
      // Store as 'yes'/'no' to match text column, toUser maps it to boolean
      row.OtherCircle = body?.otherCircle ? 'yes' : 'no';
    }

    const { error } = await supabaseAdmin.from('user_app').insert(row);
    if (error) {
      console.error('Supabase users insert error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to create user' },
        { status: 500 }
      );
    }

    const responseData: any = {
      id: userId,
      username,
      name,
      role: normalizedRole,
      email: email || '',
      status: 'active'
    };

    if (normalizedRole === 'reviewer') {
      responseData.expertise = row.Expertise;
      responseData.cvLink = row.CVLink;
      responseData.organization = row.Organization;
      responseData.yearsExperience = row.YearsExperience;
      responseData.linkedinUrl = row.LinkedInURL;
      responseData.githubIds = row.GitHubIDs;
      responseData.mattermostId = row.MattermostId;
      responseData.otherCircle = String(row.OtherCircle).toLowerCase() === 'yes';
    }

    return NextResponse.json({ success: true, message: 'User created successfully', data: responseData });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create user' },
      { status: 500 }
    );
  }
}