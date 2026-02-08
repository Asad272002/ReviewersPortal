import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabaseService } from '@/lib/supabase/service';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// RFP Projects from projectdetails.txt
const RFP_PROJECTS = [
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
    // 1. Fetch all proposals to match with RFP codes
    // Note: We assume the proposal ID or Title might contain the code, or we just return the static list 
    // populated with data if found.
    // Since the current system uses PROP-XXX IDs, we might not find a direct match for 'DFR3-RFP1' 
    // unless it's stored in a specific column.
    // However, for the purpose of this task, we will try to find proposals that might match, 
    // but primarily we will return the structure based on the RFP list.
    
    // Actually, looking at the previous analysis, the user implies these projects EXIST in the system.
    // Let's fetch all milestone reports first, as they contain proposal_id and proposal_title.
    
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('milestone_review_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (reportsError) throw reportsError;

    // Fetch partner reviews
    const { data: partnerReviews, error: prError } = await supabaseAdmin
      .from('partner_reviews')
      .select('*');

    if (prError) throw prError;

    // We will group reports by proposal_id.
    // And also try to map them to our RFP projects if possible.
    // If the proposal_id matches one of the RFP codes, great.
    // If not, we might need to look at the title.

    const projectsMap = new Map();

    // Initialize with RFP projects
    RFP_PROJECTS.forEach(p => {
      projectsMap.set(p.code, {
        id: p.code,
        title: p.name,
        isRfp: true,
        reports: [],
        stats: { total: 0, approved: 0, rejected: 0, pending: 0 }
      });
    });

    // Process reports
    reports?.forEach(report => {
      // Check if this report belongs to an RFP project
      // We check if the proposal_id matches or if the title contains the RFP name
      let matchedCode = null;

      // Direct ID match?
      if (projectsMap.has(report.proposal_id)) {
        matchedCode = report.proposal_id;
      } 
      // Title match?
      else {
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
        
        // Attach partner review if exists
        const partnerReview = partnerReviews?.find(pr => pr.report_id === report.id);

        project.reports.push({
          ...report,
          partner_review: partnerReview || null
        });

        // Update stats
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
