import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase/server';
import { renderHtmlToPdf } from '@/lib/renderHtmlToPdf';
import { validateUrl, validateNumber, validateRequiredText } from '../../../utils/validation';

export const runtime = 'nodejs';

function getClientCreds(clientJson: any): { client_id: string; client_secret: string } {
  if (!clientJson) return { client_id: '', client_secret: '' };
  const directId = String(clientJson.client_id || '');
  const directSecret = String(clientJson.client_secret || '');
  if (directId && directSecret) return { client_id: directId, client_secret: directSecret };
  const installed = clientJson.installed || {};
  if (installed.client_id && installed.client_secret) {
    return { client_id: String(installed.client_id), client_secret: String(installed.client_secret) };
  }
  const web = clientJson.web || {};
  if (web.client_id && web.client_secret) {
    return { client_id: String(web.client_id), client_secret: String(web.client_secret) };
  }
  return { client_id: '', client_secret: '' };
}

async function getOAuthAccessToken(): Promise<string> {
  let client_id = '';
  let client_secret = '';
  let refresh_token = '';

  const clientJsonEnv = process.env.GDRIVE_OAUTH_CLIENT_JSON;
  const tokenJsonEnv = process.env.GDRIVE_OAUTH_TOKEN_JSON;
  if (clientJsonEnv) {
    try {
      const parsed = JSON.parse(clientJsonEnv);
      const creds = getClientCreds(parsed);
      client_id = creds.client_id;
      client_secret = creds.client_secret;
    } catch {}
  }
  if (tokenJsonEnv) {
    try {
      const parsed = JSON.parse(tokenJsonEnv);
      refresh_token = String(parsed.refresh_token || '');
    } catch {}
  }

  if (!client_id || !client_secret) {
    const idEnv = process.env.GDRIVE_CLIENT_ID || '';
    const secretEnv = process.env.GDRIVE_CLIENT_SECRET || '';
    if (idEnv && secretEnv) {
      client_id = idEnv;
      client_secret = secretEnv;
    }
  }
  if (!refresh_token) {
    const refreshEnv = process.env.GDRIVE_REFRESH_TOKEN || '';
    if (refreshEnv) refresh_token = refreshEnv;
  }

  if (!client_id || !client_secret || !refresh_token) {
    const clientPath = process.env.GDRIVE_OAUTH_PATH || 'supabase/gdrive-oauth-client.json';
    const tokenPath = process.env.GDRIVE_CREDENTIALS_PATH || 'supabase/gdrive-oauth-token.json';
    const clientRaw = fs.readFileSync(clientPath, 'utf-8');
    const tokenRaw = fs.readFileSync(tokenPath, 'utf-8');
    const clientJson = JSON.parse(clientRaw);
    const tokenJson = JSON.parse(tokenRaw);
    const creds = getClientCreds(clientJson);
    client_id = client_id || creds.client_id;
    client_secret = client_secret || creds.client_secret;
    refresh_token = refresh_token || String(tokenJson.refresh_token || '');
  }

  const params = new URLSearchParams();
  params.set('client_id', client_id);
  params.set('client_secret', client_secret);
  params.set('refresh_token', refresh_token);
  params.set('grant_type', 'refresh_token');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const json = await res.json();
  const accessToken = String(json.access_token || '');
  if (!accessToken) throw new Error('Failed to acquire OAuth access token');
  return accessToken;
}

// HTML builder moved to lib/renderHtmlToPdf.ts

async function uploadPdfToDrive(pdf: Buffer, fileName: string, folderId: string, accessToken: string): Promise<any> {
  const boundary = 'batch_' + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name: fileName, mimeType: 'application/pdf', parents: [folderId] });
  const preamble = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`;
  const header = `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`;
  const closing = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(preamble, 'utf-8'),
    Buffer.from(header, 'utf-8'),
    pdf,
    Buffer.from(closing, 'utf-8')
  ]);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
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
    const accessToken: string = await getOAuthAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const title = `Milestone Report - ${body.proposalId || 'UNKNOWN'} - ${body.milestoneNumber || ''}`;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1PCRqTGuA3P3MNFaVimUy4Fo-kiyjT5AO';
    let reportUrl = '';
    const pdfBuffer = await renderHtmlToPdf(body);
    const uploadRes = await uploadPdfToDrive(pdfBuffer, `${title}.pdf`, folderId, accessToken);
    const documentId: string = String(uploadRes.id || '');
    if (!documentId) throw new Error('No documentId returned');
    await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
    reportUrl = `https://drive.google.com/file/d/${documentId}/view`;

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
      folder_id: '1PCRqTGuA3P3MNFaVimUy4Fo-kiyjT5AO',
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
