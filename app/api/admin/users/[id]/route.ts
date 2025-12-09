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
    createdAt: getFirst(row, ['createdAt', 'CreatedAt', 'created_at']) || '',
    updatedAt: getFirst(row, ['updatedAt', 'UpdatedAt', 'updated_at']) || ''
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, message: 'Missing id param' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('user_app')
      .select('*')
      .eq('ID', id)
      .limit(1);

    if (error) {
      console.error('Supabase user select error:', error);
      return NextResponse.json({ success: false, message: 'Failed to fetch user' }, { status: 500 });
    }

    const row = (data ?? [])[0];
    if (!row) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: toUser(row) });
  } catch (e) {
    console.error('GET /admin/users/[id] error:', e);
    return NextResponse.json({ success: false, message: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, message: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    const nowISO = new Date().toISOString();

    const updates: Record<string, any> = {};
    if (body.username !== undefined) updates.Username = String(body.username);
    if (body.password !== undefined) updates.Password = String(body.password);
    if (body.name !== undefined) updates.Name = String(body.name);
    if (body.role !== undefined) updates.Role = normalizeRole(body.role);
    if (body.email !== undefined) updates.Email = String(body.email || '');
    if (body.status !== undefined) updates.Status = String(body.status || 'active');

    // Reviewer fields (map regardless of role presence to allow partial updates)
    if (body.expertise !== undefined) updates.Expertise = String(body.expertise || '');
    if (body.cvLink !== undefined) updates.CVLink = String(body.cvLink || '');
    if (body.organization !== undefined) updates.Organization = String(body.organization || '');
    if (body.yearsExperience !== undefined) updates.YearsExperience = String(body.yearsExperience || '');
    if (body.linkedinUrl !== undefined) updates.LinkedInURL = String(body.linkedinUrl || '');
    if (body.githubIds !== undefined) updates.GitHubIDs = String(body.githubIds || '');
    if (body.mattermostId !== undefined) updates.MattermostId = String(body.mattermostId || '');
    if (body.otherCircle !== undefined) updates.OtherCircle = body.otherCircle ? 'yes' : 'no';

    updates.UpdatedAt = nowISO;

    const { error } = await supabaseAdmin
      .from('user_app')
      .update(updates)
      .eq('ID', id);

    if (error) {
      console.error('Supabase user update error:', error);
      return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
    }

    try {
      const normalizedRole = body.role !== undefined ? normalizeRole(body.role) : undefined;
      const hasTeamFields = (
        body.teamName !== undefined ||
        body.proposalId !== undefined ||
        body.proposalTitle !== undefined ||
        body.teamLeaderName !== undefined ||
        body.awardDate !== undefined ||
        body.teamUsername !== undefined
      );

      if (normalizedRole === 'team' || hasTeamFields) {
        const { data: userRows, error: userErr } = await supabaseAdmin
          .from('user_app')
          .select('Username, Email, Name')
          .eq('ID', id)
          .limit(1);
        if (!userErr) {
          const userRow = (userRows && userRows[0]) || {};
          const currentUsername = String(body.username ?? userRow?.['Username'] ?? '');
          const currentEmail = String(body.email ?? userRow?.['Email'] ?? '');
          const currentName = String(body.name ?? userRow?.['Name'] ?? '');

          let teamID: any = null;
          const { data: byLeader, error: byLeaderErr } = await supabaseAdmin
            .from('awarded_team')
            .select('"ID"')
            .eq('Team Leader Username', currentUsername)
            .limit(1);
          if (!byLeaderErr && byLeader && byLeader[0]) teamID = byLeader[0]['ID'];
          if (!teamID) {
            const { data: byTeam, error: byTeamErr } = await supabaseAdmin
              .from('awarded_team')
              .select('"ID"')
              .eq('Team Username', currentUsername)
              .limit(1);
            if (!byTeamErr && byTeam && byTeam[0]) teamID = byTeam[0]['ID'];
          }

          const teamUpdates: Record<string, any> = {};
          if (body.teamName !== undefined) teamUpdates['Team Name'] = String(body.teamName || '');
          if (body.proposalId !== undefined) teamUpdates['Proposal ID'] = String(body.proposalId || '');
          if (body.proposalTitle !== undefined) teamUpdates['Proposal Title'] = String(body.proposalTitle || '');
          if (body.teamLeaderName !== undefined || body.name !== undefined) {
            teamUpdates['Team Leader Name'] = String(body.teamLeaderName ?? body.name ?? currentName ?? '');
          }
          if (body.awardDate !== undefined) teamUpdates['Award Date'] = String(body.awardDate || '');
          if (body.username !== undefined || body.teamUsername !== undefined) {
            teamUpdates['Team Username'] = String(body.teamUsername ?? body.username ?? currentUsername);
            teamUpdates['Team Leader Username'] = String(body.username ?? currentUsername);
          }
          if (body.email !== undefined) teamUpdates['Team Leader Email'] = String(body.email || '');
          if (body.password !== undefined) teamUpdates['Team Password'] = String(body.password || '');
          teamUpdates['Updated At'] = nowISO;

          if (teamID) {
            const { error: tUpdErr } = await supabaseAdmin
              .from('awarded_team')
              .update(teamUpdates)
              .eq('ID', teamID);
            if (tUpdErr) console.error('Supabase awarded_team update error:', tUpdErr);
          } else {
            const insertRow: Record<string, any> = {
              ID: `team_${Date.now()}`,
              'Team Username': String(body.teamUsername ?? currentUsername),
              'Team Password': String(body.password ?? ''),
              'Team Name': String(body.teamName ?? currentName ?? ''),
              'Team Leader Email': String(currentEmail || ''),
              'Team Leader Name': String(body.teamLeaderName ?? currentName ?? ''),
              'Team Leader Username': String(currentUsername),
              'Proposal ID': String(body.proposalId ?? ''),
              'Proposal Title': String(body.proposalTitle ?? ''),
              'Award Date': String(body.awardDate ?? ''),
              Status: 'active',
              'Created At': nowISO,
              'Updated At': nowISO,
            };
            const { error: tInsErr } = await supabaseAdmin
              .from('awarded_team')
              .insert(insertRow);
            if (tInsErr) console.error('Supabase awarded_team insert error (PUT):', tInsErr);
          }
        } else {
          console.error('Supabase fetch user for team sync error:', userErr);
        }
      }
    } catch (syncErr) {
      console.error('PUT users team sync error:', syncErr);
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (e) {
    console.error('PUT /admin/users/[id] error:', e);
    return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, message: 'Missing id param' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('user_app')
      .delete()
      .eq('ID', id);

    if (error) {
      console.error('Supabase user delete error:', error);
      return NextResponse.json({ success: false, message: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (e) {
    console.error('DELETE /admin/users/[id] error:', e);
    return NextResponse.json({ success: false, message: 'Failed to delete user' }, { status: 500 });
  }
}