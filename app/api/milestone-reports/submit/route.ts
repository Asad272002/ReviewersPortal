import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase/server';
import { renderHtmlToPdf } from '@/lib/renderHtmlToPdf';
import { validateUrl, validateNumber, validateRequiredText } from '../../../utils/validation';

export const runtime = 'nodejs';

// Notes: Drive upload fallback was removed by request.
// To reinstate Google Drive:
// 1) Restore getOAuthAccessToken, uploadPdfToDrive, ensureFolderId functions.
// 2) Prefer Drive upload path and make Supabase Storage a fallback.
// 3) Ensure env vars (client id/secret, refresh token, folder id/name) are present.

// HTML builder moved to lib/renderHtmlToPdf.ts

async function uploadPdfToSupabaseStorage(pdf: Buffer, fileName: string): Promise<{ id: string; url: string; folderId: string } | null> {
  try {
    await supabaseAdmin.storage.createBucket('milestone-review-reports', { public: true });
  } catch {}
  const bucket = supabaseAdmin.storage.from('milestone-review-reports');
  const ts = Date.now();
  const path = `reports/${ts}-${fileName.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
  const { error: upErr } = await bucket.upload(path, pdf, { contentType: 'application/pdf', upsert: false });
  if (upErr) return null;
  const { data } = bucket.getPublicUrl(path);
  const url = String(data.publicUrl || '');
  if (!url) return null;
  return { id: path, url, folderId: 'milestone-review-reports' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const errors: string[] = [];
    const reqText = [
      ['proposalTitle','Proposal Title'],
      ['proposalId','Proposal ID'],
      ['milestoneTitle','Milestone Title'],
      ['milestoneDescriptionFromProposal','Milestone Description From Proposal']
    ] as const;
    reqText.forEach(([key,label])=>{
      const v = validateRequiredText(String(body[key]||''), label, 1, 5000);
      if (!v.isValid) errors.push(v.error!);
    });
    const urlFields = [
      ['proposalLink','Proposal Link'],
      ['deliverableLink','Deliverable Link']
    ] as const;
    urlFields.forEach(([key])=>{
      const v = validateUrl(String(body[key]||''));
      if (!v.isValid) errors.push(v.error!);
    });
    if (String(body.demoProvided||'') === 'Yes') {
      const v = validateUrl(String(body.testRunLink||''));
      if (!v.isValid) errors.push(v.error!||'Test Run Link must be a valid URL');
      const req = validateRequiredText(String(body.testRunLink||''), 'Test Run Link', 1, 2000);
      if (!req.isValid) errors.push(req.error!);
    }
    const numV = validateNumber(String(body.milestoneNumber||''), 'Milestone Number', 0, 100);
    if (!numV.isValid) errors.push(numV.error!);
    const budgetV = validateNumber(String(body.milestoneBudgetAmount||''), 'Milestone Budget Amount', 0);
    if (!budgetV.isValid) errors.push(budgetV.error!);
    if (String(body.finalRecommendation||'') === 'Approved') {
      const v = validateRequiredText(String(body.approvedWhy||''), 'Approved Why', 1, 3000);
      if (!v.isValid) errors.push(v.error!);
    } else if (String(body.finalRecommendation||'') === 'Rejected') {
      const v1 = validateRequiredText(String(body.rejectedWhy||''), 'Rejected Why', 1, 3000);
      if (!v1.isValid) errors.push(v1.error!);
      const v2 = validateRequiredText(String(body.suggestedChanges||''), 'Suggested Changes', 1, 3000);
      if (!v2.isValid) errors.push(v2.error!);
    }
    if (errors.length > 0) {
      return NextResponse.json({ status: 'error', message: errors[0] }, { status: 400 });
    }
    const title = `Milestone Report - ${body.proposalId || 'UNKNOWN'} - ${body.milestoneNumber || ''}`;
    let folderId: string | null = null;
    let reportUrl = '';
    let documentId: string | null = null;
    const pdfBuffer = await renderHtmlToPdf(body);
    {
      const sup = await uploadPdfToSupabaseStorage(pdfBuffer, `${title}.pdf`);
      if (sup) {
        documentId = sup.id;
        reportUrl = sup.url;
        folderId = sup.folderId;
      }
    }

    if (!documentId) {
      return NextResponse.json({ status: 'error', message: 'Report upload failed' }, { status: 500 });
    }

    const token = request.cookies.get('token')?.value;
    let reviewerId = '';
    let reviewerUsername = '';
    let reviewerRole = 'reviewer';
    if (token) {
      try {
        const secretKey = process.env.JWT_SECRET || 'your-secret-key';
        const secret = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, secret);
        reviewerId = String((payload as any)?.userId || '');
        reviewerUsername = String((payload as any)?.username || '');
        const roleRaw = String((payload as any)?.role || '');
        const roleNorm = roleRaw.toLowerCase().replace(/\s+/g, '_');
        reviewerRole = roleNorm === 'admin' ? 'admin' : roleNorm === 'team' || roleNorm === 'team_leader' ? 'team' : 'reviewer';
      } catch {}
    }

    const nowISO = new Date().toISOString();
    const insertPayload = {
      reviewer_id: reviewerId || null,
      reviewer_username: reviewerUsername || null,
      reviewer_handle: String(body.reviewerHandle || ''),
      proposal_id: String(body.proposalId || ''),
      proposal_title: String(body.proposalTitle || ''),
      milestone_title: String(body.milestoneTitle || ''),
      milestone_number: String(body.milestoneNumber || ''),
      milestone_budget: String(body.milestoneBudgetAmount || ''),
      date: String(body.date || ''),
      verdict: String(body.finalRecommendation || ''),
      document_id: documentId,
      document_url: reportUrl,
      folder_id: folderId || 'milestone-review-reports',
      report_data: body,
      created_at: nowISO,
      updated_at: nowISO,
    };
    const { error: insertErr } = await supabaseAdmin
      .from('milestone_review_reports')
      .insert([insertPayload]);
    if (insertErr) {
      throw new Error(`Supabase insert failed: ${insertErr.message || insertErr}`);
    }

    return NextResponse.json({ status: 'success', reportUrl }, { status: 200 });
  } catch (error: any) {
    console.error('POST /api/milestone-reports/submit error:', error?.message || error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Unknown error' }, { status: 500 });
  }
}
