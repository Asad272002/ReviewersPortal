import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateRequiredText, validateUrl, sanitizeInput } from '@/utils/validation';

export const runtime = 'nodejs';

function getFirst(row: any, keys: string[]): any {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).length > 0) return v;
  }
  return undefined;
}

function normalizeRole(roleRaw: any): 'admin' | 'reviewer' | 'team_leader' {
  const roleNorm = String(roleRaw || '').toLowerCase().replace(/\s+/g, '_');
  if (roleNorm === 'admin') return 'admin';
  if (roleNorm === 'team_leader') return 'team_leader';
  return 'reviewer';
}

async function verifyJwtAndGetUser(req: NextRequest): Promise<{ userId: string; username: string; role: 'admin' | 'reviewer' | 'team_leader' } | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const secretKey = process.env.JWT_SECRET || 'your-secret-key';
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    const userId = String((payload as any)?.userId || '');
    const username = String((payload as any)?.username || '');
    const role = normalizeRole((payload as any)?.role);
    if (!userId) return null;
    return { userId, username, role };
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const verified = await verifyJwtAndGetUser(req);
    if (!verified) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = verified;
    const { data, error } = await supabaseAdmin
      .from('user_app')
      .select('*')
      .eq('ID', userId)
      .limit(1);

    if (error) {
      console.error('Supabase profile select error:', error);
      return NextResponse.json({ success: false, message: 'Failed to fetch profile' }, { status: 500 });
    }

    const row = (data ?? [])[0];
    if (!row) return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 });

    const role = normalizeRole(getFirst(row, ['role', 'Role', 'user_role', 'userRole']));
    const responseData = {
      id: getFirst(row, ['id', 'ID', 'user_id', 'userId']) || '',
      username: getFirst(row, ['username', 'user_name', 'Username', 'User Name']) || '',
      name: getFirst(row, ['name', 'Name', 'full_name', 'Full Name', 'displayName']) || '',
      role,
      linkedinUrl: getFirst(row, ['linkedinUrl', 'LinkedInURL']) || '',
      githubIds: getFirst(row, ['githubIds', 'GitHubIDs']) || '',
      mattermostId: getFirst(row, ['mattermostId', 'MattermostId']) || '',
      // For security, we do not return the actual password. Indicate presence only.
      hasPassword: !!getFirst(row, ['password', 'Password', 'password_hash', 'passwordHash', 'PASSWORD', 'PASSWORD_HASH'])
    };

    return NextResponse.json({ success: true, profile: responseData });
  } catch (e) {
    console.error('GET /api/profile error:', e);
    return NextResponse.json({ success: false, message: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const verified = await verifyJwtAndGetUser(req);
    if (!verified) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { userId, role } = verified;

    const body = await req.json();
    const updates: Record<string, any> = {};
    const nowISO = new Date().toISOString();

    // Username
    if (body.username !== undefined) {
      const uReq = validateRequiredText(String(body.username || ''), 'Username', 3, 100);
      if (!uReq.isValid) return NextResponse.json({ success: false, message: uReq.error }, { status: 400 });
      const uInj = validateRequiredText(sanitizeInput(String(body.username || '')), 'Username', 3, 100);
      updates.Username = sanitizeInput(String(body.username));
    }

    // Password (we accept plain text to align with current DB behavior)
    if (body.password !== undefined) {
      const pReq = validateRequiredText(String(body.password || ''), 'Password', 6, 200);
      if (!pReq.isValid) return NextResponse.json({ success: false, message: pReq.error }, { status: 400 });
      updates.Password = String(body.password);
    }

    // LinkedIn URL
    if (body.linkedinUrl !== undefined) {
      const liReq = validateUrl(String(body.linkedinUrl || ''));
      if (!liReq.isValid) return NextResponse.json({ success: false, message: liReq.error }, { status: 400 });
      updates.LinkedInURL = String(body.linkedinUrl || '');
    }

    // GitHub IDs (free text)
    if (body.githubIds !== undefined) {
      updates.GitHubIDs = sanitizeInput(String(body.githubIds || ''));
    }

    // Mattermost ID
    if (body.mattermostId !== undefined) {
      updates.MattermostId = sanitizeInput(String(body.mattermostId || ''));
    }

    // Role is read-only: ignore any role field in body
    updates.UpdatedAt = nowISO;

    if (Object.keys(updates).length <= 1) { // Only UpdatedAt present
      return NextResponse.json({ success: false, message: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_app')
      .update(updates)
      .eq('ID', userId);

    if (error) {
      console.error('Supabase profile update error:', error);
      return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 });
    }

    // Re-issue JWT if username changed to keep session in sync
    let newUsername = String(verified.username);
    if (body.username) {
      newUsername = String(body.username);
    }
    const secretKey = process.env.JWT_SECRET || 'your-secret-key';
    const secret = new TextEncoder().encode(secretKey);
    const { SignJWT } = await import('jose');
    const token = await new SignJWT({ userId, username: newUsername, role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    const response = NextResponse.json({ success: true, message: 'Profile updated successfully' });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (e) {
    console.error('PUT /api/profile error:', e);
    return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 });
  }
}