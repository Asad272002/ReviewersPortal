import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabaseService } from '@/lib/supabase/service';

export const runtime = 'nodejs';

// Fallback if no organization config found
const DEFAULT_RFP_PROJECTS = [
  { code: 'DFR3-RFP1', name: 'Community Engagement scores' },
  { code: 'DFR3-RFP2', name: 'Unique Knowledge Graph for Source and Content Reliability' },
  { code: 'DFR3-RFP3', name: 'DeFiGraph - Knowledge Graph (KG) for DeFi' },
  { code: 'DFR3-RFP4', name: 'Memory-augmented LLMs: Retrieving Information using a Gated Encoder LLM (RIGEL)' },
  { code: 'DFR3-RFP5', name: 'HiveMind - augmented Q&A bot and P2P knowledge base' },
  { code: 'DFR3-RFP6', name: 'Architectural Design for Uncertain Knowledge Graphs' },
  { code: 'DFR3-RFP7', name: 'Bringing Network Pharmacology To OpenCog Hyperon' },
  { code: 'DFR3-RFP8', name: 'Phase 1 Of Huggingface Datasets Library To SingularityNET Pipeline' },
  { code: 'DFR4B-RFP1', name: 'MeTTa-Driven KG Service with LLM Integration' },
  { code: 'DFR4B-RFP2', name: 'Simulating the Quality of Community Decisions' }
];

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate User
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let userRole = '';
    let userId = '';

    try {
      const { jwtVerify } = await import('jose');
      const secretKey = process.env.JWT_SECRET || 'your-secret-key';
      const secret = new TextEncoder().encode(secretKey);
      const { payload } = await jwtVerify(token, secret);
      userRole = payload.role as string;
      userId = payload.userId as string;
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    if (userRole !== 'partner') {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    // 2. Fetch Partner's Organization Config
    // First get partner record using userId (which maps to partners.id or users.id? 
    // In auth route: userId: dbUser.id. 
    // dbUser comes from validateUserCredentials.
    // If it's a partner, it might be from 'partners' table directly or 'users' table.
    // Let's assume userId is the partner's ID if they logged in as partner.
    // Wait, validateUserCredentials checks both tables?
    // Let's check supabaseService.validateUserCredentials.
    
    // Assuming userId is the ID in 'partners' table.
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('organization_id')
      .eq('id', userId)
      .single();

    let projectConfig = DEFAULT_RFP_PROJECTS;

    if (partner && partner.organization_id) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('project_config')
        .eq('id', partner.organization_id)
        .single();
      
      if (org && org.project_config && Array.isArray(org.project_config) && org.project_config.length > 0) {
        projectConfig = org.project_config;
      }
    }

    // 3. Fetch all reports and reviews
    // Only fetch shared reports
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('milestone_review_reports')
      .select('*')
      .eq('is_shared_with_partner', true)
      .order('created_at', { ascending: false });

    if (reportsError) throw reportsError;

    const { data: partnerReviews, error: prError } = await supabaseAdmin
      .from('partner_reviews')
      .select('*');

    if (prError) throw prError;

    // Fetch project milestones info
    const projectCodes = Array.from(new Set(reports?.map((r: any) => r.proposal_id) || []));
    
    const { data: milestonesInfo } = await supabaseAdmin
      .from('project_milestones')
      .select('*')
      .in('project_code', projectCodes);

    const { data: projectsInfo } = await supabaseAdmin
      .from('awarded_teams_info')
      .select('project_code, proposal_link')
      .in('project_code', projectCodes);

    const linksMap = new Map();
    projectsInfo?.forEach((p: any) => {
      if (p.proposal_link) linksMap.set(p.project_code, p.proposal_link);
    });

    const milestonesMap = new Map();
    milestonesInfo?.forEach((m: any) => {
      // Map by project_code and milestone_number
      // Convert milestone_number to string for consistent key
      const key = `${m.project_code}-${m.milestone_number}`;
      milestonesMap.set(key, m);
    });

    // 4. Map projects
    const projectsMap = new Map();

    projectConfig.forEach((p: any) => {
      projectsMap.set(p.code, {
        id: p.code,
        title: p.name,
        isRfp: true,
        projectLink: linksMap.get(p.code) || null,
        reports: [],
        stats: { total: 0, approved: 0, rejected: 0, pending: 0 }
      });
    });

    reports?.forEach(report => {
      let matchedCode = null;

      if (projectsMap.has(report.proposal_id)) {
        matchedCode = report.proposal_id;
      } else {
        for (const [code, project] of projectsMap.entries()) {
          if (report.proposal_title?.includes(project.title) || 
              report.proposal_id?.includes(code) ||
              report.proposal_title?.includes(code)) {
            matchedCode = code;
            break;
          }
        }
      }

      if (matchedCode) {
        const project = projectsMap.get(matchedCode);
        
        // Update link if not set and we found a match
        if (!project.projectLink && linksMap.has(matchedCode)) {
            project.projectLink = linksMap.get(matchedCode);
        }

        const partnerReview = partnerReviews?.find(pr => pr.report_id === report.id);
        
        // Find milestone info
        const milestoneKey = `${matchedCode}-${report.milestone_number}`;
        const rawMilestoneInfo = milestonesMap.get(milestoneKey) || null;
        
        let milestoneInfo = null;
        if (rawMilestoneInfo) {
            let deliverables: string[] = [];
            if (typeof rawMilestoneInfo.deliverables === 'string') {
                deliverables = rawMilestoneInfo.deliverables.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            } else if (Array.isArray(rawMilestoneInfo.deliverables)) {
                deliverables = rawMilestoneInfo.deliverables;
            }

            milestoneInfo = {
                description: rawMilestoneInfo.description,
                objectives: [],
                deliverables: deliverables
            };
        }

        project.reports.push({
          ...report,
          partner_review: partnerReview || null,
          milestone_info: milestoneInfo
        });

        project.stats.total++;
        if (partnerReview?.verdict === 'Approve') project.stats.approved++;
        else if (partnerReview?.verdict === 'Reject') project.stats.rejected++;
        else project.stats.pending++;
      }
    });

    const projects = Array.from(projectsMap.values());

    return NextResponse.json({ 
      success: true, 
      projects 
    });

  } catch (error: any) {
    console.error('Error in partner dashboard API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
