import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

type Role = 'admin' | 'reviewer' | 'team';

function normalizeRole(roleRaw: any): Role {
  const roleNorm = String(roleRaw || '').toLowerCase().replace(/\s+/g, '_');
  if (roleNorm === 'admin') return 'admin';
  if (roleNorm === 'team' || roleNorm === 'team_leader') return 'team';
  return 'reviewer';
}

export async function verifyJwtAndGetUser(req: NextRequest): Promise<{ userId: string; username: string; role: Role } | null> {
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
