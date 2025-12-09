import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { proposalId, proposalTitle, teamName, email, status } = body as { proposalId?: string; proposalTitle?: string; teamName?: string; email?: string; status?: string }
    if (!id) return NextResponse.json({ success: false, message: 'Missing id param' }, { status: 400 })

    const now = new Date().toISOString()
    const updatesModern: Record<string, any> = { updatedAt: now }
    if (proposalId != null) updatesModern.proposalId = proposalId
    if (proposalTitle != null) updatesModern.proposalTitle = proposalTitle
    if (teamName != null) updatesModern.name = teamName
    if (email != null) updatesModern.email = email
    if (status != null) updatesModern.status = status

    const respModern = await supabaseAdmin
      .from('awarded_teams')
      .update(updatesModern)
      .eq('id', id)
      .select('*')
      .limit(1)

    // Also update legacy table if present
    const updatesLegacy: Record<string, any> = { 'Updated At': now }
    if (proposalId != null) updatesLegacy['Proposal ID'] = proposalId
    if (proposalTitle != null) updatesLegacy['Proposal Title'] = proposalTitle
    if (teamName != null) updatesLegacy['Team Name'] = teamName
    if (email != null) updatesLegacy['Team Leader Email'] = email
    if (status != null) updatesLegacy['Status'] = status

    await supabaseAdmin
      .from('awarded_team')
      .update(updatesLegacy)
      .eq('ID', id)

    const row = (respModern.data ?? [])[0]
    if (respModern.error && !row) {
      return NextResponse.json({ success: false, message: 'Failed to update team' }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: { id, updatedAt: now } })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update team' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) return NextResponse.json({ success: false, message: 'Missing id param' }, { status: 400 })

    const { error: errModern } = await supabaseAdmin
      .from('awarded_teams')
      .delete()
      .eq('id', id)

    const { error: errLegacy } = await supabaseAdmin
      .from('awarded_team')
      .delete()
      .eq('ID', id)

    if (errModern && errLegacy) {
      return NextResponse.json({ success: false, message: 'Failed to delete team' }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: 'Team deleted successfully' })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to delete team' }, { status: 500 })
  }
}

