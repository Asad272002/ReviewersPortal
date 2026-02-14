import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return false;
  try {
    const { jwtVerify } = await import('jose');
    const secretKey = process.env.JWT_SECRET || 'your-secret-key';
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

type TargetType = 'auto' | 'partners' | 'awarded_team' | 'user_app';

function normalizeString(val: any): string {
  return String(val || '').trim();
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lookupRaw = body?.lookup;
    const deepDidRaw = body?.deepDid;
    const targetType: TargetType = (body?.targetType || 'auto').toLowerCase();

    const lookup = normalizeString(lookupRaw);
    const deepDidInput = normalizeString(deepDidRaw);
    const deepDid = deepDidInput.replace(/^did:/i, ''); // normalize: strip optional did: prefix

    if (!lookup || !deepDid) {
      return NextResponse.json({ success: false, message: 'lookup and deepDid are required' }, { status: 400 });
    }
    if (!['auto', 'partners', 'awarded_team', 'user_app'].includes(targetType)) {
      return NextResponse.json({ success: false, message: 'Invalid targetType' }, { status: 400 });
    }

    // Uniqueness check across all tables
    const uniqueChecks = await Promise.all([
      supabaseAdmin.from('partners').select('*').eq('deep_did', deepDid).limit(1),
      supabaseAdmin.from('awarded_team').select('*').eq('deep_did', deepDid).limit(1),
      supabaseAdmin.from('user_app').select('*').eq('deep_did', deepDid).limit(1),
    ]);
    for (const ch of uniqueChecks) {
      if (!ch.error && Array.isArray(ch.data) && ch.data.length > 0) {
        return NextResponse.json({ success: false, message: 'deepDid already linked to an account' }, { status: 409 });
      }
    }

    // Finder helpers (fetch limited rows and search in-memory for flexibility)
    const getFirst = (row: any, keys: string[]) => {
      for (const k of keys) {
        const v = row?.[k];
        if (v !== undefined && v !== null && String(v).length > 0) return v;
      }
      return undefined;
    };

    async function findInPartners() {
      const { data, error } = await supabaseAdmin.from('partners').select('*').limit(2000);
      if (error) throw error;
      const rows = data || [];
      return rows.find((r: any) => {
        const id = String(getFirst(r, ['id', 'ID']) || '').trim();
        const uname = String(getFirst(r, ['username', 'Username']) || '').trim();
        const name = String(getFirst(r, ['name', 'Name']) || '').trim();
        const lk = lookup.toLowerCase();
        return [id, uname, name].some((v) => String(v).toLowerCase() === lk);
      });
    }

    async function findInAwardedTeam() {
      const { data, error } = await supabaseAdmin
        .from('awarded_team')
        .select('*')
        .limit(2000);
      if (error) throw error;
      const rows = data || [];
      return rows.find((r: any) => {
        const id = String(getFirst(r, ['ID', 'id']) || '').trim();
        const teamUser = String(getFirst(r, ['Team Username', 'Team Leader Username']) || '').trim();
        const name = String(getFirst(r, ['Team Name', 'Name']) || '').trim();
        const lk = lookup.toLowerCase();
        return [id, teamUser, name].some((v) => String(v).toLowerCase() === lk);
      });
    }

    async function findInUserApp() {
      const { data, error } = await supabaseAdmin.from('user_app').select('*').limit(2000);
      if (error) throw error;
      const rows = data || [];
      return rows.find((r: any) => {
        const id = String(getFirst(r, ['id', 'ID', 'user_id', 'userId']) || '').trim();
        const uname = String(getFirst(r, ['username', 'user_name', 'Username', 'User Name']) || '').trim();
        const name = String(getFirst(r, ['name', 'Name', 'full_name', 'Full Name', 'displayName']) || '').trim();
        const lk = lookup.toLowerCase();
        return [id, uname, name].some((v) => String(v).toLowerCase() === lk);
      });
    }

    let updatedTable: 'partners' | 'awarded_team' | 'user_app' | null = null;
    let updatedId: string | null = null;

    if (targetType === 'partners' || targetType === 'auto') {
      const row = await findInPartners();
      if (row) {
        const idVal = String(getFirst(row, ['id', 'ID']) || '');
        const { error } = await supabaseAdmin.from('partners').update({ deep_did: deepDid }).eq('id', idVal);
        if (error) throw error;
        updatedTable = 'partners';
        updatedId = idVal;
      }
    }
    if (!updatedTable && (targetType === 'awarded_team' || targetType === 'auto')) {
      const row = await findInAwardedTeam();
      if (row) {
        const idVal = String(getFirst(row, ['ID', 'id']) || '');
        const { error } = await supabaseAdmin.from('awarded_team').update({ deep_did: deepDid }).eq('ID', idVal);
        if (error) throw error;
        updatedTable = 'awarded_team';
        updatedId = idVal;
      }
    }
    if (!updatedTable && (targetType === 'user_app' || targetType === 'auto')) {
      const row = await findInUserApp();
      if (row) {
        const idVal = String(getFirst(row, ['id', 'ID', 'user_id', 'userId']) || '');
        const idCol =
          Object.prototype.hasOwnProperty.call(row, 'ID') ? 'ID' :
          Object.prototype.hasOwnProperty.call(row, 'id') ? 'id' :
          Object.prototype.hasOwnProperty.call(row, 'user_id') ? 'user_id' :
          Object.prototype.hasOwnProperty.call(row, 'userId') ? 'userId' :
          'ID';
        const { error } = await supabaseAdmin.from('user_app').update({ deep_did: deepDid }).eq(idCol, idVal);
        if (error) throw error;
        updatedTable = 'user_app';
        updatedId = idVal;
      }
    }

    if (!updatedTable) {
      return NextResponse.json({ success: false, message: 'No matching record found for lookup' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'deepDid linked successfully',
      data: { table: updatedTable, id: updatedId, deepDid },
    });
  } catch (error: any) {
    console.error('Link Deep-DID error:', error?.message || error);
    return NextResponse.json({ success: false, message: 'Failed to link deepDid' }, { status: 500 });
  }
}
