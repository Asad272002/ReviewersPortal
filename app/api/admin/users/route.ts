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

function normalizeRole(roleRaw: any): 'admin' | 'reviewer' | 'team' {
  const roleNorm = String(roleRaw || '')
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (roleNorm === 'admin') return 'admin';
  if (roleNorm === 'team' || roleNorm === 'team_leader') return 'team';
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
    base.otherCircle = String(getFirst(row, ['otherCircle', 'OtherCircle']) || '')
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

    try {
      const { data: teamRows, error: teamErr } = await supabaseAdmin
        .from('awarded_team')
        .select('"ID", "Team Name", "Proposal ID", "Proposal Title", "Team Username", "Team Leader Username", "Team Leader Email", "Team Leader Name", "Award Date"')
        .limit(2000);
      if (!teamErr && Array.isArray(teamRows)) {
        const byTeamUsername = new Map<string, any>();
        const byLeaderUsername = new Map<string, any>();
        for (const r of teamRows) {
          const tUser = r?.['Team Username'] || '';
          const lUser = r?.['Team Leader Username'] || '';
          const entry = {
            id: r?.['ID'] || '',
            teamName: r?.['Team Name'] || '',
            proposalId: r?.['Proposal ID'] || '',
            proposalTitle: r?.['Proposal Title'] || '',
            teamUsername: tUser || lUser || '',
            teamLeaderUsername: lUser || '',
            teamLeaderEmail: r?.['Team Leader Email'] || '',
            teamLeaderName: r?.['Team Leader Name'] || '',
            awardDate: r?.['Award Date'] || ''
          };
          if (tUser) byTeamUsername.set(String(tUser), entry);
          if (lUser) byLeaderUsername.set(String(lUser), entry);
        }
        for (const u of users) {
          if (u.role === 'team') {
            const m = byTeamUsername.get(String(u.username)) || byLeaderUsername.get(String(u.username));
            if (m) {
              (u as any).teamName = m.teamName;
              (u as any).proposalId = m.proposalId;
              (u as any).proposalTitle = m.proposalTitle;
              (u as any).teamUsername = m.teamUsername;
              (u as any).teamLeaderName = m.teamLeaderName;
              (u as any).awardDate = m.awardDate;
            }
          }
        }
      } else if (teamErr) {
        console.error('Supabase awarded_team select error:', teamErr);
      }
    } catch (e) {
      console.error('GET users enrichment error:', e);
    }

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
    const contentType = request.headers.get('content-type') || ''
    let body: any = {}

    if (contentType.includes('application/json')) {
      body = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const raw = await request.text()
      const params = new URLSearchParams(raw)
      body = Object.fromEntries(params.entries())
    } else if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      body = Object.fromEntries(Array.from(form.entries()))
    } else {
      const raw = await request.text()
      try {
        body = raw ? JSON.parse(raw) : {}
      } catch (e) {
        return NextResponse.json(
          { success: false, message: 'Invalid request body' },
          { status: 400 }
        )
      }
    }

    const { username, password, name, role, email } = body || {}

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'Username, password, name, and role are required' },
        { status: 400 }
      )
    }

    const userId = `user_${Date.now()}`
    const nowISO = new Date().toISOString()
    const normalizedRole = normalizeRole(role)

    const row: Record<string, any> = {
      ID: userId,
      Username: String(username),
      Password: String(password),
      Name: String(name),
      Role: normalizedRole,
      Email: String(email || ''),
      Status: 'active',
      CreatedAt: nowISO,
      UpdatedAt: nowISO,
    }

    if (normalizedRole === 'reviewer') {
      row.Expertise = body?.expertise ?? ''
      row.CVLink = body?.cvLink ?? ''
      row.Organization = body?.organization ?? ''
      row.YearsExperience = body?.yearsExperience ?? ''
      row.LinkedInURL = body?.linkedinUrl ?? ''
      row.GitHubIDs = body?.githubIds ?? ''
      row.MattermostId = body?.mattermostId ?? ''
      row.OtherCircle = body?.otherCircle ? 'yes' : 'no'
    }

    const { error } = await supabaseAdmin.from('user_app').insert(row)
    if (error) {
      console.error('Supabase users insert error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to create user' },
        { status: 500 }
      )
    }

    if (normalizedRole === 'team') {
      const teamRow: Record<string, any> = {
        ID: `team_${Date.now()}`,
        'Team Username': String(body?.teamUsername || username),
        'Team Password': String(password),
        'Team Name': String(body?.teamName || name),
        'Team Leader Email': String(email || ''),
        'Team Leader Name': String(body?.teamLeaderName || name || ''),
        'Team Leader Username': String(username),
        'Proposal ID': String(body?.proposalId || ''),
        'Proposal Title': String(body?.proposalTitle || ''),
        'Award Date': String(body?.awardDate || ''),
        Status: 'active',
        'Created At': nowISO,
        'Updated At': nowISO,
      }
      const { error: teamInsertError } = await supabaseAdmin.from('awarded_team').insert(teamRow)
      if (teamInsertError) {
        console.error('Supabase awarded_team insert error:', teamInsertError)
      }
    }

    const responseData: any = {
      id: userId,
      username: String(username),
      name: String(name),
      role: normalizedRole,
      email: String(email || ''),
      status: 'active',
    }

    if (normalizedRole === 'reviewer') {
      responseData.expertise = row.Expertise
      responseData.cvLink = row.CVLink
      responseData.organization = row.Organization
      responseData.yearsExperience = row.YearsExperience
      responseData.linkedinUrl = row.LinkedInURL
      responseData.githubIds = row.GitHubIDs
      responseData.mattermostId = row.MattermostId
      responseData.otherCircle = String(row.OtherCircle).toLowerCase() === 'yes'
    }

    return NextResponse.json({ success: true, message: 'User created successfully', data: responseData })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create user' },
      { status: 500 }
    )
  }
}