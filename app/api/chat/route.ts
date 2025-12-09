import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET - Fetch chat messages for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    if (!sessionId || !userId || !userRole) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Fetch chat session
    const { data: sessionRows, error: sessionErr } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .limit(1);
    if (sessionErr) {
      console.error('Supabase error fetching chat session:', sessionErr);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch chat session' },
        { status: 500 }
      );
    }
    const session = sessionRows && sessionRows[0];
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Verify user access
    if ((userRole === 'user' || userRole === 'team') && session.team_id !== userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
    const idsMatchFlex = (a: any, b: any) => {
      const sa = String(a ?? '');
      const sb = String(b ?? '');
      if (sa === sb) return true;
      const da = sa.replace(/\D/g, '');
      const db = sb.replace(/\D/g, '');
      return da && db && da === db;
    };
    if (userRole === 'reviewer' && !idsMatchFlex(session.reviewer_id, userId)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch chat messages from Supabase
    const { data: messageRows, error: msgErr } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });
    if (msgErr) {
      console.error('Supabase error fetching chat messages:', msgErr);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch chat messages' },
        { status: 500 }
      );
    }

    const messages = (messageRows || []).map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      senderId: row.sender_id,
      senderType: row.sender_type,
      senderName: row.sender_name,
      message: row.message,
      messageType: row.message_type,
      fileUrl: row.file_url,
      fileName: row.file_name,
      timestamp: row.timestamp,
      isRead: !!row.is_read,
    }));

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.session_id,
          teamId: session.team_id,
          reviewerId: session.reviewer_id,
          status: session.status,
          createdAt: session.created_at,
        },
        messages,
      },
    });

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

// POST - Send a new chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, senderId, senderType, message, messageType = 'text', fileUrl, fileName } = body;

    if (!sessionId || !senderId || !senderType || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify session exists and is active
    const { data: sessionRows, error: sessionErr } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .limit(1);
    if (sessionErr) {
      console.error('Supabase error fetching chat session:', sessionErr);
      return NextResponse.json(
        { success: false, message: 'Failed to verify chat session' },
        { status: 500 }
      );
    }
    const session = sessionRows && sessionRows[0];
    if (!session || session.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Chat session not found or inactive' },
        { status: 404 }
      );
    }

    const timestamp = new Date().toISOString();

    // Determine sender name based on type
    let senderName = 'Unknown';
    if (senderType === 'team') {
      senderName = `Team ${senderId}`;
    } else if (senderType === 'reviewer') {
      senderName = 'Review Circle Reviewer';
    } else if (senderType === 'admin') {
      senderName = 'Administrator';
    }

    // Insert message into Supabase
    const { data: insertedRows, error: insertErr } = await supabaseAdmin
      .from('chat_messages')
      .insert([
        {
          session_id: sessionId,
          assignment_id: session.assignment_id ?? null,
          sender_id: senderId,
          sender_type: senderType,
          sender_name: senderName,
          message,
          message_type: messageType,
          file_url: fileUrl || null,
          file_name: fileName || null,
          timestamp,
          is_read: false,
          created_at: timestamp,
        },
      ])
      .select('*');

    if (insertErr) {
      console.error('Supabase error inserting chat message:', insertErr);
      return NextResponse.json(
        { success: false, message: 'Failed to send message' },
        { status: 500 }
      );
    }

    const inserted = insertedRows && insertedRows[0];
    const messageId = inserted?.id ?? '';

    // Update session last activity
    const { error: updateErr } = await supabaseAdmin
      .from('chat_sessions')
      .update({ last_activity: timestamp })
      .eq('session_id', sessionId);
    if (updateErr) {
      console.warn('Supabase warning updating last_activity:', updateErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId,
        timestamp,
        senderName,
      },
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send message' },
      { status: 500 }
    );
  }
}