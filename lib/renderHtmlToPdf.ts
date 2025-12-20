import fs from 'fs'
import path from 'path'
import chromium from '@sparticuz/chromium-min'
import puppeteerCore from 'puppeteer-core'
import puppeteer from 'puppeteer'

export interface MilestoneReportData {
  reviewerHandle: string
  proposalLink: string
  proposalTitle: string
  proposalId: string
  milestoneTitle: string
  milestoneNumber: string | number
  milestoneBudgetAmount: string | number
  date: string
  demoProvided: 'Yes' | 'No'
  testRunLink?: string
  verificationStatus: 'Yes' | 'No'
  milestoneDescriptionFromProposal: string
  deliverableLink: string
  qDeliverablesMet: '1' | '2' | '3' | ''
  jDeliverablesMet: string
  qQualityCompleteness: '1' | '2' | '3' | ''
  jQualityCompleteness: string
  qEvidenceAccessibility: '1' | '2' | '3' | ''
  jEvidenceAccessibility: string
  qBudgetAlignment: '1' | '2' | '3' | ''
  jBudgetAlignment: string
  finalRecommendation: 'Approved' | 'Rejected'
  approvedWhy?: string
  rejectedWhy?: string
  suggestedChanges?: string
}

function colorForRating(val: string): string {
  if (val === '1') return '#22C55E'
  if (val === '2') return '#FACC15'
  return '#EF4444'
}

function pointsFor(val: string): number {
  if (val === '1') return 1
  if (val === '2') return 0.5
  return 0
}

function formatDateDDMMMYYYY(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = String(d.getFullYear())
  return `${day} ${month} ${year}`
}

function getLogoDataUrl(): string {
  try {
    const candidates = [
      path.join(process.cwd(), 'report_template', 'deeplogo.png'),
      path.join(process.cwd(), 'report_template', 'deep-logo.png'),
      path.join(process.cwd(), 'public', 'deep-logo.png')
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const b64 = fs.readFileSync(p).toString('base64')
        return `data:image/png;base64,${b64}`
      }
    }
  } catch {}
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#F59E0B"/><stop offset="50%" stop-color="#A96AFF"/><stop offset="100%" stop-color="#60A5FA"/></linearGradient></defs><rect rx="24" ry="24" width="140" height="140" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-size="56" font-family="Montserrat, Arial, sans-serif" fill="#0C021E" font-weight="700">DEP</text></svg>`
  const b64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${b64}`
}

function buildHtmlFromTemplate(data: MilestoneReportData): string {
  const tplPath = path.join(process.cwd(), 'report_template', 'templatedesign.html')
  const raw = fs.readFileSync(tplPath, 'utf-8')
  const cssMatch = raw.match(/<style>([\s\S]*?)<\/style>/)
  const css = cssMatch ? cssMatch[1] : ''

  const reviewer = 'Review Circle'
  const milestoneNumber = String(data.milestoneNumber || '')
  const dateFmt = formatDateDDMMMYYYY(String(data.date || ''))
  const proposalTitle = String(data.proposalTitle || '')
  const proposalLink = String(data.proposalLink || '')
  const milestoneTitle = String(data.milestoneTitle || '')
  const milestoneBudget = String(data.milestoneBudgetAmount || '')
  const proposalId = String(data.proposalId || '')
  const verdict = String(data.finalRecommendation || '')
  const approvedWhy = String(data.approvedWhy || '')
  const rejectedWhy = String(data.rejectedWhy || '')
  const suggestedChanges = String(data.suggestedChanges || '')
  const demoProvided = String(data.demoProvided || '')
  const testRunLink = String(data.testRunLink || '')
  const verificationStatus = String(data.verificationStatus || '')
  const milestoneDescriptionFromProposal = String(data.milestoneDescriptionFromProposal || '')
  const deliverableLink = String(data.deliverableLink || '')
  const q1 = String(data.qDeliverablesMet || '1')
  const q2 = String(data.qQualityCompleteness || '1')
  const q3 = String(data.qEvidenceAccessibility || '1')
  const q4 = String(data.qBudgetAlignment || '1')
  const j1 = String(data.jDeliverablesMet || '')
  const j2 = String(data.jQualityCompleteness || '')
  const j3 = String(data.jEvidenceAccessibility || '')
  const j4 = String(data.jBudgetAlignment || '')
  const criteriaScore = pointsFor(q1) + pointsFor(q2) + pointsFor(q3) + pointsFor(q4)
  const criteriaDisplay = `${criteriaScore % 1 === 0 ? criteriaScore.toFixed(0) : criteriaScore.toFixed(1)}/4`

  const logoUrl = getLogoDataUrl()

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>DEEP - RC Milestone Review Report</title>
    <style>${css}</style>
  </head>
  <body>
  <div class="page-container">
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${logoUrl}" alt="DEEP Logo" style="height:48px; width:auto;" />
        <h1 class="header-title">RC Milestone Review Report</h1>
      </div>
      <div class="date-row" style="margin-top:12px;">📅 <span>${dateFmt}</span></div>

      <div class="verdict-box" style="${verdict==='Approved' ? 'background: linear-gradient(90deg,#052e0d,#0b5d1a); border-color:#22C55E;' : 'background: linear-gradient(90deg,#3b0b0b,#6b1818); border-color:#EF4444;'}">
        Milestone Review Submitted by ${reviewer}!
        <span>Milestone Verdict: <b style="color:${verdict==='Approved' ? '#22C55E' : '#EF4444'};">${verdict}</b></span>
      </div>

      <h2 class="section-title">Project Details</h2>
      <div class="details-grid">
        <div class="detail-item"><div class="detail-label">👤 Reviewer</div><div class="detail-value">${reviewer}</div></div>
        <div class="detail-item"><div class="detail-label">📄 Milestone Title</div><div class="detail-value">${milestoneTitle}</div></div>
        <div class="detail-item"><div class="detail-label">#️⃣ Milestone Number</div><div class="detail-value">${milestoneNumber}</div></div>
        <div class="detail-item"><div class="detail-label">💲 Milestone Budget Amount</div><div class="detail-value">${milestoneBudget}</div></div>
        <div class="detail-item"><div class="detail-label">📅 Date</div><div class="detail-value">${dateFmt}</div></div>
        <div class="detail-item"><div class="detail-label">🆔 Proposal ID</div><div class="detail-value">${proposalId}</div></div>
      </div>

      <div class="proposal-title">
        <b>Proposal Title</b><br>
        ${proposalTitle}
      </div>

      <div class="view-proposal">🔗 <a href="${proposalLink}" target="_blank" style="color:#2563EB;">View Proposal</a></div>

      <h2 class="section-title">Review Criteria</h2>
      <div style="margin:10px 0; padding:10px; border:1px solid #9D9FA9; border-radius:12px; background:#0C021E; color:#FFFFFF;">
        <div style="margin-bottom:6px; font-family: Montserrat, sans-serif;">Rating Legend</div>
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <div style="display:flex; gap:6px; align-items:center;">
            <span style="background:#22C55E; color:#052e0d; padding:4px 10px; border-radius:9999px; font-weight:600;">1</span>
            <span style="color:#FFFFFF; font-size:12px;">Fully Met</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span style="background:#FACC15; color:#3b3005; padding:4px 10px; border-radius:9999px; font-weight:600;">2</span>
            <span style="color:#FFFFFF; font-size:12px;">Partially Met</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span style="background:#EF4444; color:#3b0b0b; padding:4px 10px; border-radius:9999px; font-weight:600;">3</span>
            <span style="color:#FFFFFF; font-size:12px;">Not Met</span>
          </div>
        </div>
      </div>
      <div class="proposal-title" style="margin-bottom:8px;">
        <b>Milestone Description From Proposal</b>
        <div style="margin-top:6px;">${milestoneDescriptionFromProposal}</div>
      </div>
      <div class="view-proposal">🔗 Deliverable Link: <a href="${deliverableLink}" target="_blank" style="color:#2563EB;">${deliverableLink}</a></div>
      <div class="criteria-grid">
        <div class="criteria-card"><div class="criteria-title">Deliverables Match Milestone Description</div><div class="badge" style="background:${colorForRating(q1)}; color:#000;">${q1}</div></div>
        <div class="criteria-card"><div class="criteria-title">Quality and Completeness of Milestone</div><div class="badge" style="background:${colorForRating(q2)}; color:#000;">${q2}</div></div>
        <div class="criteria-card"><div class="criteria-title">Accessibility of Supporting Evidence</div><div class="badge" style="background:${colorForRating(q3)}; color:#000;">${q3}</div></div>
        <div class="criteria-card"><div class="criteria-title">Budget Alignment (Value for Money)</div><div class="badge" style="background:${colorForRating(q4)}; color:#000;">${q4}</div></div>
      </div>

      <h2 class="section-title">Justifications</h2>
      ${j1 ? `<div class="justification-box"><div class="justification-number">1</div>${j1}</div>` : ''}
      ${j2 ? `<div class="justification-box"><div class="justification-number">2</div>${j2}</div>` : ''}
      ${j3 ? `<div class="justification-box"><div class="justification-number">3</div>${j3}</div>` : ''}
      ${j4 ? `<div class="justification-box"><div class="justification-number">4</div>${j4}</div>` : ''}

      <div class="demo-box">
        <div class="demo-title">Did the team provide a demo, prototype, repository test run, or marketplace onboarding trial?</div>
        <div class="yes-badge" style="background:${demoProvided==='Yes' ? '#22C55E' : '#EF4444'}; color:#000;">${demoProvided}</div>
        ${testRunLink && demoProvided==='Yes' ? `<div>Test Run Link:</div><a href="${testRunLink}" target="_blank" style="color:#2563EB;">${testRunLink}</a>` : ''}
        <div style="margin-top:8px;">Reviewer was able to verify functionality: <span style="background:${verificationStatus==='Yes' ? '#22C55E' : '#EF4444'}; color:#000; padding:4px 8px; border-radius:9999px;">${verificationStatus}</span></div>
      </div>

      <div class="final-box">
        <div class="final-header">Final Recommendation</div>
        <div class="approved-badge" style="background:${verdict==='Approved' ? '#22C55E' : '#EF4444'}; color:#000;">${verdict}</div>
        <div>${verdict==='Approved' ? approvedWhy : rejectedWhy}</div>
        ${verdict==='Rejected' && suggestedChanges ? `<div style="margin-top:6px;"><b>Suggested Changes:</b> ${suggestedChanges}</div>` : ''}
        <div class="final-stats">
          <div class="stat-card"><div class="stat-label">Status</div><div class="stat-value">✓ ${verdict}</div></div>
          <div class="stat-card"><div class="stat-label">Criteria Met</div><div class="stat-value">${criteriaDisplay}</div></div>
          <div class="stat-card"><div class="stat-label">Budget</div><div class="stat-value">${milestoneBudget}</div></div>
        </div>
      </div>

  </div>
  </body>
  </html>`
}

export async function renderHtmlToPdf(data: MilestoneReportData): Promise<Buffer> {
  const html = buildHtmlFromTemplate(data)
  const isProd = !!process.env.VERCEL
  const browser = await (async () => {
    if (isProd) {
      const packUrl = process.env.CHROMIUM_PACK_URL
      const executablePath = packUrl ? await chromium.executablePath(packUrl) : await chromium.executablePath()
      return puppeteerCore.launch({
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-features=HttpsFirstBalancedModeAutoEnable'],
        executablePath,
        headless: chromium.headless
      })
    }
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
  })()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' } })
    const buffer = Buffer.from(pdf)
    return buffer
  } finally {
    await browser.close()
  }
}
