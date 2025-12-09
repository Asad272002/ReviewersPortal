import { NextRequest, NextResponse } from 'next/server';

import { getVotingDurationDaysFresh } from '../../lib/voting-settings';
import { supabaseService } from '@/lib/supabase/service';
import { validateInput, validateRequiredText, validateNumber, sanitizeInput } from '../../utils/validation';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const requiredFields = [
      'reviewerName',
      'proposalTitle',
      'projectCategory',
      'teamSize',
      'budgetEstimate',
      'timelineWeeks',
      'proposalSummary',
      'technicalApproach'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const errors: string[] = [];

    const nameValidation = validateRequiredText(data.reviewerName, 'Reviewer Name', 1, 100);
    if (!nameValidation.isValid) errors.push(nameValidation.error!);

    const titleValidation = validateRequiredText(data.proposalTitle, 'Proposal Title', 1, 200);
    if (!titleValidation.isValid) errors.push(titleValidation.error!);

    const allowedCategories = new Set(['development','research','infrastructure','community','other']);
    if (!allowedCategories.has(data.projectCategory)) {
      errors.push('Please select a valid project category');
    }

    const allowedTeamSizes = new Set(['1','2-5','6-10','11+']);
    if (!allowedTeamSizes.has(data.teamSize)) {
      errors.push('Please select a valid team size');
    }

    const budgetValidation = validateNumber(data.budgetEstimate, 'Budget Estimate', 0);
    if (!budgetValidation.isValid) errors.push(budgetValidation.error!);

    const timelineValidation = validateNumber(data.timelineWeeks, 'Timeline (weeks)', 1, 104);
    if (!timelineValidation.isValid) errors.push(timelineValidation.error!);

    const summaryValidation = validateRequiredText(data.proposalSummary, 'Proposal Summary', 1, 2000);
    if (!summaryValidation.isValid) errors.push(summaryValidation.error!);
    const summaryInjectionCheck = validateInput(data.proposalSummary, 'Proposal Summary');
    if (!summaryInjectionCheck.isValid) errors.push(summaryInjectionCheck.error!);

    const approachValidation = validateRequiredText(data.technicalApproach, 'Technical Approach', 1, 2000);
    if (!approachValidation.isValid) errors.push(approachValidation.error!);
    const approachInjectionCheck = validateInput(data.technicalApproach, 'Technical Approach');
    if (!approachInjectionCheck.isValid) errors.push(approachInjectionCheck.error!);

    if (data.additionalNotes) {
      const notesCheck = validateInput(data.additionalNotes, 'Additional Notes');
      if (!notesCheck.isValid) errors.push(notesCheck.error!);
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors[0] },
        { status: 400 }
      );
    }

    const payload = {
      reviewerName: sanitizeInput(String(data.reviewerName)).trim(),
      proposalTitle: sanitizeInput(String(data.proposalTitle)).trim(),
      projectCategory: String(data.projectCategory),
      teamSize: String(data.teamSize),
      budgetEstimate: String(data.budgetEstimate).trim(),
      timelineWeeks: String(data.timelineWeeks).trim(),
      proposalSummary: sanitizeInput(String(data.proposalSummary)).trim(),
      technicalApproach: sanitizeInput(String(data.technicalApproach)).trim(),
      additionalNotes: sanitizeInput(String(data.additionalNotes || '')).trim(),
    };
    
    console.log('Proposal data to be submitted to Supabase:', payload);

    // Compute deadline from current setting (fresh, no cache)
    const votingDurationDays = await getVotingDurationDaysFresh();
    const submissionDate = new Date();
    const votingDeadline = new Date(submissionDate.getTime() + (votingDurationDays * 24 * 60 * 60 * 1000));

    // Generate sequential proposal ID and insert row into Supabase
    const proposalId = await supabaseService.generateNextProposalId();

    await supabaseService.createProposal({
      id: proposalId,
      reviewer_name: payload.reviewerName,
      proposal_title: payload.proposalTitle,
      project_category: payload.projectCategory,
      team_size: payload.teamSize,
      budget_estimate: payload.budgetEstimate,
      timeline_weeks: payload.timelineWeeks,
      proposal_summary: payload.proposalSummary,
      technical_approach: payload.technicalApproach,
      additional_notes: payload.additionalNotes,
      submission_date: submissionDate.toISOString(),
      voting_deadline: votingDeadline.toISOString(),
    });

    // Invalidate proposals cache so subsequent reads reflect the new submission immediately
    supabaseService.invalidateAllCaches();

    return NextResponse.json({
      success: true,
      message: 'Proposal submitted successfully',
      data: {
        id: proposalId,
        submittedAt: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
          timeZoneName: 'short'
        }),
      }
    });
    
  } catch (error) {
    console.error('Error submitting proposal:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}