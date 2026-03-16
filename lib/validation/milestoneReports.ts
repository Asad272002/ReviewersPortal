/**
 * Lightweight runtime validation for milestone report types.
 *
 * Purpose:
 * - future-safe validation without adding new dependencies
 * - prevent schema drift when mock data and Deep Ops reads are introduced
 *
 * Design source:
 * - docs/integrations/deep-ops-milestone-report-architecture.md
 */

import type { DeepOpsLink, PortalMilestoneReport, PortalPartnerShareState } from '../types/milestoneReports';

type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null | undefined {
  return value === null || value === undefined || isNumber(value);
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || isString(value);
}

export function validateDeepOpsLink(input: unknown): ValidationResult<DeepOpsLink> {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['DeepOpsLink must be an object'] };

  if (!isString(input.deep_ops_project_code) || input.deep_ops_project_code.trim().length === 0) {
    errors.push('DeepOpsLink.deep_ops_project_code must be a non-empty string');
  }
  if (!isNumber(input.deep_ops_milestone_number)) {
    errors.push('DeepOpsLink.deep_ops_milestone_number must be a number');
  }
  if (!isNumber(input.deep_ops_deliverable_id)) {
    errors.push('DeepOpsLink.deep_ops_deliverable_id must be a number');
  }
  if (!isNullableNumber(input.deep_ops_review_id)) {
    errors.push('DeepOpsLink.deep_ops_review_id must be a number, null, or undefined');
  }
  if (!isString(input.linked_at) || input.linked_at.trim().length === 0) {
    errors.push('DeepOpsLink.linked_at must be a non-empty string');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: input as DeepOpsLink };
}

export function validatePortalMilestoneReport(input: unknown): ValidationResult<PortalMilestoneReport> {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['PortalMilestoneReport must be an object'] };

  if (!isString(input.id) || input.id.trim().length === 0) errors.push('PortalMilestoneReport.id must be a non-empty string');
  if (!isNumber(input.report_version)) errors.push('PortalMilestoneReport.report_version must be a number');
  if (!isString(input.created_at) || input.created_at.trim().length === 0) errors.push('PortalMilestoneReport.created_at must be a non-empty string');
  if (!isString(input.created_by_user_id) || input.created_by_user_id.trim().length === 0) errors.push('PortalMilestoneReport.created_by_user_id must be a non-empty string');

  const linkRes = validateDeepOpsLink(input.deepOpsLink);
  if (!linkRes.ok) errors.push(...linkRes.errors.map((e) => `PortalMilestoneReport.deepOpsLink: ${e}`));

  const outcome = input.internal_outcome;
  if (!isString(outcome)) {
    errors.push('PortalMilestoneReport.internal_outcome must be a string');
  } else if (!['approved', 'rejected'].includes(outcome)) {
    errors.push('PortalMilestoneReport.internal_outcome must be one of: approved, rejected');
  }

  if (!isNullableString(input.internal_notes)) errors.push('PortalMilestoneReport.internal_notes must be a string, null, or undefined');
  if (!isString(input.pdf_storage_key) || input.pdf_storage_key.trim().length === 0) errors.push('PortalMilestoneReport.pdf_storage_key must be a non-empty string');
  if (!isNullableString(input.pdf_access_url)) errors.push('PortalMilestoneReport.pdf_access_url must be a string, null, or undefined');

  const snapshot = input.snapshot;
  if (!isRecord(snapshot)) {
    errors.push('PortalMilestoneReport.snapshot must be an object');
  } else {
    if (!isString(snapshot.deep_ops_fetched_at) || snapshot.deep_ops_fetched_at.trim().length === 0) {
      errors.push('PortalMilestoneReport.snapshot.deep_ops_fetched_at must be a non-empty string');
    }

    const project = snapshot.project;
    if (!isRecord(project)) {
      errors.push('PortalMilestoneReport.snapshot.project must be an object');
    } else {
      if (!isString(project.code) || project.code.trim().length === 0) errors.push('PortalMilestoneReport.snapshot.project.code must be a non-empty string');
      if (!isNullableString(project.title)) errors.push('PortalMilestoneReport.snapshot.project.title must be a string, null, or undefined');
    }

    const milestone = snapshot.milestone;
    if (!isRecord(milestone)) {
      errors.push('PortalMilestoneReport.snapshot.milestone must be an object');
    } else {
      if (!isNumber(milestone.number)) errors.push('PortalMilestoneReport.snapshot.milestone.number must be a number');
      if (!isNullableString(milestone.title)) errors.push('PortalMilestoneReport.snapshot.milestone.title must be a string, null, or undefined');
      if (!(milestone.price === undefined || milestone.price === null || isNumber(milestone.price))) errors.push('PortalMilestoneReport.snapshot.milestone.price must be a number, null, or undefined');
      if (!isNullableString(milestone.status)) errors.push('PortalMilestoneReport.snapshot.milestone.status must be a string, null, or undefined');
    }

    const deliverable = snapshot.deliverable;
    if (!isRecord(deliverable)) {
      errors.push('PortalMilestoneReport.snapshot.deliverable must be an object');
    } else {
      if (!isNumber(deliverable.deep_ops_deliverable_id)) errors.push('PortalMilestoneReport.snapshot.deliverable.deep_ops_deliverable_id must be a number');
      if (!isNullableString(deliverable.status)) errors.push('PortalMilestoneReport.snapshot.deliverable.status must be a string, null, or undefined');
      if (!isNullableString(deliverable.description)) errors.push('PortalMilestoneReport.snapshot.deliverable.description must be a string, null, or undefined');
      if (!isNullableString(deliverable.ticket)) errors.push('PortalMilestoneReport.snapshot.deliverable.ticket must be a string, null, or undefined');
      if (!(deliverable.requested_amount === undefined || deliverable.requested_amount === null || isNumber(deliverable.requested_amount))) errors.push('PortalMilestoneReport.snapshot.deliverable.requested_amount must be a number, null, or undefined');
      if (!(deliverable.remaining_amount === undefined || deliverable.remaining_amount === null || isNumber(deliverable.remaining_amount))) errors.push('PortalMilestoneReport.snapshot.deliverable.remaining_amount must be a number, null, or undefined');
      if (!(deliverable.milestone_price === undefined || deliverable.milestone_price === null || isNumber(deliverable.milestone_price))) errors.push('PortalMilestoneReport.snapshot.deliverable.milestone_price must be a number, null, or undefined');
      if (!isNullableString(deliverable.created_at)) errors.push('PortalMilestoneReport.snapshot.deliverable.created_at must be a string, null, or undefined');
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: input as PortalMilestoneReport };
}

export function validatePortalPartnerShareState(input: unknown): ValidationResult<PortalPartnerShareState> {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['PortalPartnerShareState must be an object'] };

  if (!isString(input.report_id) || input.report_id.trim().length === 0) errors.push('PortalPartnerShareState.report_id must be a non-empty string');
  if (!isNullableString(input.partner_org_id)) errors.push('PortalPartnerShareState.partner_org_id must be a string, null, or undefined');

  if (!isString(input.share_status)) {
    errors.push('PortalPartnerShareState.share_status must be a string');
  } else if (!['not_shared', 'shared', 'partner_responded', 'error', 'revoked'].includes(input.share_status)) {
    errors.push('PortalPartnerShareState.share_status must be one of: not_shared, shared, partner_responded, error, revoked');
  }

  if (!isNullableString(input.shared_at)) errors.push('PortalPartnerShareState.shared_at must be a string, null, or undefined');
  if (!isNullableString(input.shared_by_user_id)) errors.push('PortalPartnerShareState.shared_by_user_id must be a string, null, or undefined');
  if (!isNullableString(input.last_share_error)) errors.push('PortalPartnerShareState.last_share_error must be a string, null, or undefined');

  const pf = input.partner_feedback;
  if (!isRecord(pf)) {
    errors.push('PortalPartnerShareState.partner_feedback must be an object');
  } else {
    const verdict = pf.verdict;
    if (!(verdict === undefined || verdict === null || (isString(verdict) && ['approved', 'rejected', 'needs_changes', 'comment_only'].includes(verdict)))) {
      errors.push('PortalPartnerShareState.partner_feedback.verdict must be one of: approved, rejected, needs_changes, comment_only (or null/undefined)');
    }
    if (!isNullableString(pf.comment)) errors.push('PortalPartnerShareState.partner_feedback.comment must be a string, null, or undefined');
    if (!isNullableString(pf.submitted_at)) errors.push('PortalPartnerShareState.partner_feedback.submitted_at must be a string, null, or undefined');
    if (!isNullableString(pf.submitted_by_partner_user_id)) errors.push('PortalPartnerShareState.partner_feedback.submitted_by_partner_user_id must be a string, null, or undefined');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: input as PortalPartnerShareState };
}
