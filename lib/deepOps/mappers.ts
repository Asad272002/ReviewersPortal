import type { DeepOpsDeliverable, DeepOpsReview, DeepOpsUpdatedMilestone } from './client';

export type PortalKey = {
  project_code: string;
  milestone_number: number;
  deliverable_id: number;
};

export type PortalDeliverableSummary = {
  key: PortalKey;
  deliverable_id: number;
  project_code: string;
  milestone_number: number;
  status?: string | null;
  project_title?: string | null;
  requested_amount?: number | null;
  remaining_amount?: number | null;
  milestone_price?: number | null;
  ticket?: string | null;
  description?: string | null;
  created_at?: string | null;
};

export type PortalReviewSummary = {
  review_id: number;
  project_code: string;
  milestone_number: number;
  deliverable_id?: number | null;
  review_status?: string | null;
  added_date?: string | null;
  file_url?: string | null;
  audit_date?: string | null;
  audit_feedback?: string | null;
};

export type PortalMilestoneFeedItem = {
  project_code: string;
  milestone_number: number;
  project_status: string;
  milestone_status: string;
  deliverable_link?: string | null;
  amount_paid?: number | null;
  transfer_date?: string | null;
};

export type PortalMatchQuality = 'no_review' | 'deliverable_id_only' | 'strict_match';

export type PortalReportCandidate = {
  key: PortalKey;
  deliverable: PortalDeliverableSummary;
  review?: PortalReviewSummary | null;
  match_quality: PortalMatchQuality;
  mismatch_reasons?: string[] | null;
  deep_ops: {
    deliverable_id: number;
    review_id?: number | null;
  };
};

export function buildPortalKey(input: { project_code: string; milestone_number: number; deliverable_id: number }): PortalKey {
  return {
    project_code: input.project_code,
    milestone_number: input.milestone_number,
    deliverable_id: input.deliverable_id,
  };
}

export function mapDeepOpsDeliverableToPortalDeliverableSummary(d: DeepOpsDeliverable): PortalDeliverableSummary {
  const key = buildPortalKey({
    project_code: d.project_code,
    milestone_number: d.milestone_number,
    deliverable_id: d.deliverable_id,
  });

  return {
    key,
    deliverable_id: d.deliverable_id,
    project_code: d.project_code,
    milestone_number: d.milestone_number,
    status: d.status ?? null,
    project_title: d.project_title ?? null,
    requested_amount: d.requested_amount ?? null,
    remaining_amount: d.remaining_amount ?? null,
    milestone_price: d.milestone_price ?? null,
    ticket: d.ticket ?? null,
    description: d.description ?? null,
    created_at: d.created_at ?? null,
  };
}

export function mapDeepOpsReviewToPortalReviewSummary(r: DeepOpsReview): PortalReviewSummary {
  return {
    review_id: r.review_id,
    project_code: r.project_code,
    milestone_number: r.milestone_number,
    deliverable_id: r.deliverable_id ?? null,
    review_status: r.review_status ?? null,
    added_date: r.added_date ?? null,
    file_url: r.file_url ?? null,
    audit_date: r.audit_date ?? null,
    audit_feedback: r.audit_feedback ?? null,
  };
}

export function mapDeepOpsUpdatedMilestoneToPortalMilestoneFeedItem(m: DeepOpsUpdatedMilestone): PortalMilestoneFeedItem {
  return {
    project_code: m.project_code,
    milestone_number: m.milestone_number,
    project_status: m.project_status,
    milestone_status: m.milestone_status,
    deliverable_link: m.deliverable_link ?? null,
    amount_paid: m.amount_paid ?? null,
    transfer_date: m.transfer_date ?? null,
  };
}

/**
 * Report-candidate review selection heuristic (current, not final business logic):
 * - Prefer the review with the latest `added_date`
 * - Fallback: prefer the review with the highest `review_id`
 *
 * Future refinements (likely):
 * - Prefer audited reviews (if audit fields are present and meaningful)
 * - Prefer approved/rejected status rules once Deep Ops status semantics are confirmed
 * - Explicitly model/handle multiple reviews per deliverable rather than collapsing to one “best” review
 */
function compareReviewPreferred(a: PortalReviewSummary, b: PortalReviewSummary) {
  const ad = a.added_date ? Date.parse(a.added_date) : NaN;
  const bd = b.added_date ? Date.parse(b.added_date) : NaN;
  if (!Number.isNaN(ad) && !Number.isNaN(bd) && ad !== bd) return bd - ad;
  return b.review_id - a.review_id;
}

export function buildPortalReportCandidates(input: {
  deliverables: DeepOpsDeliverable[];
  reviews: DeepOpsReview[];
}): PortalReportCandidate[] {
  const deliverableSummaries = input.deliverables.map(mapDeepOpsDeliverableToPortalDeliverableSummary);
  const reviewsByDeliverableId = new Map<number, PortalReviewSummary[]>();

  for (const r of input.reviews) {
    const s = mapDeepOpsReviewToPortalReviewSummary(r);
    const deliverableId = s.deliverable_id;
    if (deliverableId == null) continue;
    const list = reviewsByDeliverableId.get(deliverableId) ?? [];
    list.push(s);
    reviewsByDeliverableId.set(deliverableId, list);
  }

  const candidates: PortalReportCandidate[] = [];
  for (const d of deliverableSummaries) {
    const list = reviewsByDeliverableId.get(d.deliverable_id) ?? [];
    list.sort(compareReviewPreferred);
    const best = list[0] ?? null;

    const mismatch: string[] = [];
    const deliverableIdOk = best ? best.deliverable_id === d.deliverable_id : false;
    const projectCodeOk = best ? best.project_code === d.project_code : false;
    const milestoneNumberOk = best ? best.milestone_number === d.milestone_number : false;
    if (best) {
      if (!deliverableIdOk) mismatch.push('deliverable_id_mismatch');
      if (!projectCodeOk) mismatch.push('project_code_mismatch');
      if (!milestoneNumberOk) mismatch.push('milestone_number_mismatch');
    }
    const strictMatch = best ? deliverableIdOk && projectCodeOk && milestoneNumberOk : false;

    candidates.push({
      key: d.key,
      deliverable: d,
      review: best,
      match_quality: best ? (strictMatch ? 'strict_match' : 'deliverable_id_only') : 'no_review',
      mismatch_reasons: best && !strictMatch ? mismatch : null,
      deep_ops: {
        deliverable_id: d.deliverable_id,
        review_id: best ? best.review_id : null,
      },
    });
  }

  return candidates;
}
