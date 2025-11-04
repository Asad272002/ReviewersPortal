import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET - Fetch chat sessions for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Flexible session lookup to handle reviewer ID mismatches between legacy and modern tables
    let data: any[] = [];
    let error: any = null;

    const orderByCreated = (q: any) => q.order('created_at', { ascending: false });

    if (userRole === 'user' || userRole === 'team') {
      const { data: rows, error: err } = await orderByCreated(
        supabaseAdmin.from('chat_sessions').select('*').eq('team_id', userId)
      );
      if (err) error = err;
      if (rows) data = rows;
    } else if (userRole === 'reviewer') {
      const addResults = (rows?: any[]) => {
        if (rows && rows.length) {
          // Deduplicate by session_id
          const existing = new Set(data.map((r: any) => r.session_id));
          rows.forEach((r: any) => {
            if (!existing.has(r.session_id)) data.push(r);
          });
        }
      };

      const digits = String(userId).replace(/\D/g, '');

      // Try exact match first
      {
        const { data: r1, error: e1 } = await orderByCreated(
          supabaseAdmin.from('chat_sessions').select('*').eq('reviewer_id', userId)
        );
        if (e1) error = e1;
        addResults(r1);
      }

      // Fallback: numeric digits match (legacy writes)
      if (digits && digits !== userId) {
        const { data: r2, error: e2 } = await orderByCreated(
          supabaseAdmin.from('chat_sessions').select('*').eq('reviewer_id', digits)
        );
        if (e2) error = e2;
        addResults(r2);
      }

      // Try mapping via reviewers table (id/userID equivalence)
      try {
        const orFilters = [
          `id.eq.${userId}`,
          `userID.eq.${userId}`,
        ];
        if (digits && digits !== userId) {
          orFilters.push(`id.eq.${digits}`);
          orFilters.push(`userID.eq.${digits}`);
        }

        const { data: reviewerRows } = await supabaseAdmin
          .from('reviewers')
          .select('id, userID')
          .or(orFilters.join(','))
          .limit(10);

        for (const rev of reviewerRows || []) {
          const candidates = [rev.id, String(rev.userID || '').trim()].filter(Boolean);
          for (const candidate of candidates) {
            const { data: rX } = await orderByCreated(
              supabaseAdmin.from('chat_sessions').select('*').eq('reviewer_id', candidate)
            );
            addResults(rX);
          }
        }
      } catch (e) {
        // Non-fatal: continue with what we have
      }
    } else if (userRole === 'admin') {
      // Admins can list all sessions (most recent first)
      const { data: rows, error: err } = await orderByCreated(
        supabaseAdmin.from('chat_sessions').select('*')
      );
      if (err) error = err;
      if (rows) data = rows;
    }

    if (error) {
      console.error('Supabase error fetching sessions:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch chat sessions' },
        { status: 500 }
      );
    }

    const sessions = (data || []).map((row: any) => ({
      id: row.session_id,
      teamId: row.team_id,
      reviewerId: row.reviewer_id,
      assignmentId: row.assignment_id,
      status: row.status,
      createdAt: row.created_at,
      lastActivity: row.last_activity,
      createdBy: row.created_by,
    }));

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}

// POST - Create a new chat session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, assignmentId, createdBy } = body;

    if (!teamId || !assignmentId || !createdBy) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify assignment exists and is active in Supabase (fallback across table shapes)
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

    if (assignmentNormalized.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Assignment is not active' },
        { status: 400 }
      );
    }

    if (assignmentNormalized.teamId !== teamId) {
      return NextResponse.json(
        { success: false, message: 'Team ID mismatch' },
        { status: 400 }
      );
    }

    // Check if an active session already exists for this assignment
    const { data: existing, error: existError } = await supabaseAdmin
      .from('chat_sessions')
      .select('session_id')
      .eq('assignment_id', assignmentId)
      .eq('status', 'active')
      .limit(1);

    if (existError) {
      console.error('Supabase error checking existing session:', existError);
      return NextResponse.json(
        { success: false, message: 'Failed to check existing session' },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Session already exists',
        data: {
          sessionId: existing[0].session_id,
          status: 'existing'
        }
      });
    }

    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentTime = new Date().toISOString();
    const reviewerId = assignmentNormalized.reviewerId;

    const { error: insertError } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        session_id: sessionId,
        team_id: teamId,
        reviewer_id: reviewerId,
        assignment_id: assignmentId,
        status: 'active',
        created_at: currentTime,
        last_activity: currentTime,
        created_by: createdBy,
      });

    if (insertError) {
      console.error('Supabase error creating session:', insertError);
      return NextResponse.json(
        { success: false, message: 'Failed to create chat session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chat session created successfully',
      data: {
        sessionId,
        teamId,
        reviewerId,
        assignmentId,
        status: 'active',
        createdAt: currentTime
      }
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}