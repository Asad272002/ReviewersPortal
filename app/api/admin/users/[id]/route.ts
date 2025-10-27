import { NextResponse } from 'next/server';
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
    base.otherCircle = String(getFirst(row, ['otherCircle', 'OtherCircle'] || ''))
      .trim()
      .toLowerCase() === 'yes';
  }
  return base;
}

export async function GET(_req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id?: string };
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

export async function PUT(req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id?: string };
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

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (e) {
    console.error('PUT /admin/users/[id] error:', e);
    return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id?: string };
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