import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

type ProjectItem = { code: string; title: string }

function parseProjectDetailsTxt(): ProjectItem[] {
  try {
    const filePath = path.join(process.cwd(), 'report_template', 'projectdetails.txt')
    const raw = fs.readFileSync(filePath, 'utf-8')
    const lines = raw.split(/\r?\n/)
    const items: ProjectItem[] = []

    // Parse Markdown table rows: | CODE | TITLE |
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('|')) continue
      // Skip header separator rows like | :----: | :----: |
      if (/:\-+?:/i.test(trimmed)) continue
      const parts = trimmed.split('|').map(p => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        const code = parts[0]
        const title = parts[1]
        if (code && title && code !== 'Project Code' && title !== 'Project Name' && title !== 'Proposal Title') {
          items.push({ code, title })
        }
      }
    }

    // Parse simple HTML table segment for DFR4
    const htmlRows = raw.match(/<tr>[\s\S]*?<\/tr>/g) || []
    for (const row of htmlRows) {
      const cells = Array.from(row.matchAll(/<td[^>]*>([^<]+)<\/td>/g)).map(m => m[1].trim())
      if (cells.length >= 2) {
        const code = cells[0]
        const title = cells[1]
        if (code && title) items.push({ code, title })
      }
    }

    return items
  } catch {
    return []
  }
}

function dedupe(items: ProjectItem[]): ProjectItem[] {
  const byCode = new Map<string, ProjectItem>()
  const byTitle = new Map<string, ProjectItem>()
  for (const it of items) {
    if (!byCode.has(it.code)) byCode.set(it.code, it)
    if (!byTitle.has(it.title)) byTitle.set(it.title, it)
  }
  // Prefer byCode entries, but ensure unique titles also included
  const out = Array.from(byCode.values())
  for (const t of byTitle.values()) {
    if (!byCode.has(t.code) && !out.find(x => x.title === t.title)) out.push(t)
  }
  return out
}

export async function GET(_req: NextRequest) {
  try {
    let projects: ProjectItem[] = []

    // First, try Supabase awarded teams tables (dynamic, admin CRUD)
    try {
      const { data: teamData, error } = await supabaseAdmin
        .from('awarded_teams')
        .select('*')
        .limit(2000)
      if (!error && Array.isArray(teamData)) {
        for (const row of teamData) {
          const code = String(row.proposalId || '').trim()
          const title = String(row.proposalTitle || row.projectTitle || row.teamName || '').trim()
          if (code || title) projects.push({ code, title })
        }
      }
      // Legacy fallback
      const { data: legacy, error: legacyErr } = await supabaseAdmin
        .from('awarded_team')
        .select('"Proposal ID", "Proposal Title"')
        .limit(2000)
      if (!legacyErr && Array.isArray(legacy)) {
        for (const row of legacy) {
          const code = String(row['Proposal ID'] || '').trim()
          const title = String(row['Proposal Title'] || '').trim()
          if (code || title) projects.push({ code, title })
        }
      }
    } catch {
      // ignore; we'll fall back to file
    }

    // Fallback/merge with static file
    const fromFile = parseProjectDetailsTxt()
    projects = dedupe([...projects, ...fromFile])

    return NextResponse.json({ success: true, data: { projects } })
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Failed to load projects' }, { status: 500 })
  }
}

