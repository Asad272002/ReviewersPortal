import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET - Fetch specific chat session details
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { data: rows, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('session_id', id)
      .limit(1);

    if (error) {
      console.error('Supabase error fetching session:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch chat session' },
        { status: 500 }
      );
    }

    const session = rows && rows[0];
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

    const sessionData = {
      id: session.session_id,
      teamId: session.team_id,
      reviewerId: session.reviewer_id,
      assignmentId: session.assignment_id,
      status: session.status,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      createdBy: session.created_by,
      endedAt: session.ended_at,
      endedBy: session.ended_by,
    };

    return NextResponse.json({ success: true, data: sessionData });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch chat session' },
      { status: 500 }
    );
  }
}

// PUT - Update chat session (end session, change status)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, userId, userRole } = body;

    if (!action || !userId || !userRole) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: rows, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('session_id', id)
      .limit(1);

    if (error) {
      console.error('Supabase error fetching session:', error);
      return NextResponse.json(
        { success: false, message: 'Chat sessions not available' },
        { status: 500 }
      );
    }

    const session = rows && rows[0];
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

    const currentTime = new Date().toISOString();
    let update: any = { last_activity: currentTime };

    switch (action) {
      case 'end':
        update = { ...update, status: 'ended', ended_at: currentTime, ended_by: userId };
        break;
      case 'pause':
        update = { ...update, status: 'paused' };
        break;
      case 'resume':
        if (session.status !== 'paused') {
          return NextResponse.json(
            { success: false, message: 'Session is not paused' },
            { status: 400 }
          );
        }
        update = { ...update, status: 'active' };
        break;
      case 'update_activity':
        // only update last_activity
        break;
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    const { error: updError } = await supabaseAdmin
      .from('chat_sessions')
      .update(update)
      .eq('session_id', id);

    if (updError) {
      console.error('Supabase error updating session:', updError);
      return NextResponse.json(
        { success: false, message: 'Failed to update chat session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Session ${action}ed successfully`,
      data: {
        id: id,
        status: update.status ?? session.status,
        lastActivity: currentTime,
        endedAt: update.ended_at ?? session.ended_at,
        endedBy: update.ended_by ?? session.ended_by,
      }
    });
  } catch (error) {
    console.error('Error updating chat session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update chat session' },
      { status: 500 }
    );
  }
}

// DELETE - Delete chat session (admin only)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');

    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { error: delMsgsError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('session_id', id);
    if (delMsgsError) {
      console.error('Supabase error deleting messages:', delMsgsError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete session messages' },
        { status: 500 }
      );
    }

    const { error: delSessionError } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('session_id', id);
    if (delSessionError) {
      console.error('Supabase error deleting session:', delSessionError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete chat session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Chat session and associated messages deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete chat session' },
      { status: 500 }
    );
  }
}