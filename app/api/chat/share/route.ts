import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// POST - Generate a shareable chat link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, adminId } = body;

    // Only assignmentId is required; adminId is optional for created_by attribution
    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify assignment exists and is approved/active in Supabase
    let assignmentNormalized: { teamId: string; reviewerId: string; status: string } | null = null;

    // Try legacy table with spaced, quoted columns
    {
      const { data: assignmentRows, error: assignErr } = await supabaseAdmin
        .from('team_reviewer_assignment')
        .select('"ID", "Status", "Team ID", "Reviewer ID"')
        .eq('ID', assignmentId)
        .limit(1);
      if (!assignErr && assignmentRows && assignmentRows[0]) {
        const a = assignmentRows[0];
        assignmentNormalized = {
          teamId: a['Team ID'],
          reviewerId: a['Reviewer ID'],
          status: String(a['Status'] || '').toLowerCase(),
        };
      }
    }

    // Fallback to newer snake_case table
    if (!assignmentNormalized) {
      const { data: assignmentRows2, error: assignErr2 } = await supabaseAdmin
        .from('team_reviewer_assignments')
        .select('id, status, teamId, reviewerId')
        .eq('id', assignmentId)
        .limit(1);
      if (!assignErr2 && assignmentRows2 && assignmentRows2[0]) {
        const a2 = assignmentRows2[0];
        assignmentNormalized = {
          teamId: a2.teamId,
          reviewerId: a2.reviewerId,
          status: String(a2.status || '').toLowerCase(),
        };
      }
    }

    if (!assignmentNormalized) {
      return NextResponse.json(
        { success: false, message: 'Assignment not found' },
        { status: 404 }
      );
    }
    if (!['approved', 'active'].includes(assignmentNormalized.status)) {
      return NextResponse.json(
        { success: false, message: 'Assignment must be approved to generate chat link' },
        { status: 400 }
      );
    }

    // Check for existing active chat session for the assignment
    const { data: existingSessions, error: sessErr } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('status', 'active')
      .limit(1);
    if (sessErr) {
      console.error('Supabase error fetching existing session:', sessErr);
      return NextResponse.json(
        { success: false, message: 'Failed to check existing chat sessions' },
        { status: 500 }
      );
    }

    let shareToken: string;
    let sessionId: string;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (existingSessions && existingSessions[0]) {
      const sess = existingSessions[0];
      sessionId = sess.session_id;
      shareToken = sess.share_token || `share_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      if (!sess.share_token || !sess.share_expires_at) {
        const { error: updErr } = await supabaseAdmin
          .from('chat_sessions')
          .update({ share_token: shareToken, share_expires_at: expiresAt })
          .eq('session_id', sessionId);
        if (updErr) {
          console.warn('Supabase warning updating share token for existing session:', updErr);
        }
      }
    } else {
      // Create new session
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      shareToken = `share_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

      const { error: insertErr } = await supabaseAdmin
        .from('chat_sessions')
        .insert([
          {
            session_id: sessionId,
            assignment_id: assignmentId,
            team_id: assignmentNormalized.teamId,
            reviewer_id: assignmentNormalized.reviewerId,
            status: 'active',
            created_at: now,
            last_activity: now,
            created_by: adminId || 'system',
            share_token: shareToken,
            share_expires_at: expiresAt,
          },
        ]);
      if (insertErr) {
        console.error('Supabase error creating chat session:', insertErr);
        return NextResponse.json(
          { success: false, message: 'Failed to create chat session' },
          { status: 500 }
        );
      }
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/chat/shared/${shareToken}`;

    return NextResponse.json({
      success: true,
      message: 'Shareable chat link generated successfully',
      data: {
        sessionId,
        shareToken,
        shareUrl,
        assignmentId,
        teamId: assignmentNormalized.teamId,
        reviewerId: assignmentNormalized.reviewerId,
      },
    });

  } catch (error) {
    console.error('Error generating shareable chat link:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate shareable chat link' },
      { status: 500 }
    );
  }
}

// GET - Validate a share token and get session info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get('token');

    if (!shareToken) {
      return NextResponse.json(
        { success: false, message: 'Share token is required' },
        { status: 400 }
      );
    }

    // Find chat session by share token
    const { data: rows, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('share_token', shareToken)
      .limit(1);
    if (error) {
      console.error('Supabase error fetching session by token:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to validate share token' },
        { status: 500 }
      );
    }
    const session = rows && rows[0];
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid share token' },
        { status: 404 }
      );
    }

    // Check expiry and active status
    const exp = session.share_expires_at ? new Date(session.share_expires_at) : null;
    if (exp && exp.getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: 'Share link has expired' },
        { status: 410 }
      );
    }
    if (session.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Chat session is not active' },
        { status: 403 }
      );
    }

    // Team info from Supabase (awarded_team)
    let teamInfo: any = null;
    const { data: teamRows, error: teamErr } = await supabaseAdmin
      .from('awarded_team')
      .select('"ID", "Team Name", "Proposal Title"')
      .eq('ID', session.team_id)
      .limit(1);
    if (!teamErr) {
      const t = teamRows && teamRows[0];
      if (t) {
        teamInfo = {
          id: t['ID'],
          name: t['Team Name'],
          description: t['Proposal Title'] || '',
        };
      }
    }

    // Reviewer info (anonymized)
    const reviewerInfo = {
      id: session.reviewer_id,
      name: 'Review Circle Reviewer',
      email: '',
    };

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.session_id,
        assignmentId: session.assignment_id,
        teamId: session.team_id,
        reviewerId: session.reviewer_id,
        status: session.status,
        createdAt: session.created_at,
        expiresAt: session.share_expires_at,
        teamInfo,
        reviewerInfo,
      },
    });

  } catch (error) {
    console.error('Error validating share token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to validate share token' },
      { status: 500 }
    );
  }
}