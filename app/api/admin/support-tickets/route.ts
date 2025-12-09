import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET: Fetch support tickets from Supabase
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase support_tickets fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }

    return NextResponse.json({ tickets: data ?? [] });
  } catch (e) {
    console.error('Error fetching tickets:', e);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// POST: Create a new support ticket in Supabase
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, category, message } = body ?? {};

    if (!name || !email || !category || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newTicket = {
      id: crypto.randomUUID(),
      name,
      email,
      category,
      message,
      status: 'open',
      priority: 'normal',
      assignedTo: '',
      notes: '',
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabaseAdmin
      .from('support_tickets')
      .insert([newTicket]);

    if (error) {
      console.error('Supabase support_tickets insert error:', error);
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Ticket created', ticket: newTicket }, { status: 201 });
  } catch (e) {
    console.error('Error creating ticket:', e);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}