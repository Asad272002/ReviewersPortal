import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyJwtAndGetUser } from '@/lib/auth/admin-auth';

export const runtime = 'nodejs';

function getFirst(row: any, keys: string[]) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).length > 0) return v;
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  const info = await verifyJwtAndGetUser(req);
  if (!info || info.role !== 'admin') {
    return NextResponse.json({ success: false, suggestions: [] }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = String(url.searchParams.get('q') || '').trim();
  const target = String(url.searchParams.get('target') || 'auto').toLowerCase();
  if (!q) return NextResponse.json({ success: true, suggestions: [] });

  const lc = q.toLowerCase();
  const suggestions: Array<{ table: string; id: string; username: string; name: string; label: string }> = [];

  async function fromPartners() {
    const { data, error } = await supabaseAdmin.from('partners').select('*').limit(2000);
    if (error) return;
    for (const r of data || []) {
      const id = String(getFirst(r, ['id', 'ID']) || '').trim();
      const username = String(getFirst(r, ['username', 'Username']) || '').trim();
      const name = String(getFirst(r, ['name', 'Name']) || '').trim();
      if ([id, username, name].some(v => v.toLowerCase().includes(lc))) {
        suggestions.push({ table: 'partners', id, username, name, label: `${username || name || id} (partners)` });
      }
      if (suggestions.length >= 10) break;
    }
  }

  async function fromAwardedTeam() {
    const { data, error } = await supabaseAdmin.from('awarded_team').select('*').limit(2000);
    if (error) return;
    for (const r of data || []) {
      const id = String(getFirst(r, ['ID', 'id']) || '').trim();
      const username = String(getFirst(r, ['Team Username', 'Team Leader Username']) || '').trim();
      const name = String(getFirst(r, ['Team Name', 'Name']) || '').trim();
      if ([id, username, name].some(v => v.toLowerCase().includes(lc))) {
        suggestions.push({ table: 'awarded_team', id, username, name, label: `${username || name || id} (awarded_team)` });
      }
      if (suggestions.length >= 10) break;
    }
  }

  async function fromUserApp() {
    const { data, error } = await supabaseAdmin.from('user_app').select('*').limit(2000);
    if (error) return;
    for (const r of data || []) {
      const id = String(getFirst(r, ['id', 'ID', 'user_id', 'userId']) || '').trim();
      const username = String(getFirst(r, ['username', 'user_name', 'Username', 'User Name']) || '').trim();
      const name = String(getFirst(r, ['name', 'Name', 'full_name', 'Full Name', 'displayName']) || '').trim();
      if ([id, username, name].some(v => v.toLowerCase().includes(lc))) {
        suggestions.push({ table: 'user_app', id, username, name, label: `${username || name || id} (user_app)` });
      }
      if (suggestions.length >= 10) break;
    }
  }

  if (target === 'partners') {
    await fromPartners();
  } else if (target === 'awarded_team') {
    await fromAwardedTeam();
  } else if (target === 'user_app') {
    await fromUserApp();
  } else {
    await fromPartners();
    if (suggestions.length < 10) await fromAwardedTeam();
    if (suggestions.length < 10) await fromUserApp();
  }

  const unique = new Map<string, any>();
  for (const s of suggestions) {
    const key = `${s.table}:${s.id}:${s.username}:${s.name}`;
    if (!unique.has(key)) unique.set(key, s);
  }
  const result = Array.from(unique.values()).slice(0, 10);
  return NextResponse.json({ success: true, suggestions: result });
}

