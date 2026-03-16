/**
 * Canonical milestone report linkage + workflow types.
 *
 * Design source:
 * - docs/integrations/deep-ops-milestone-report-architecture.md
 *
 * Phase 1 only:
 * - deliverable-centered linkage is required
 * - deep_ops_review_id is optional enrichment
 * - snapshots are immutable per report_version
 * - partner verdict/comments are portal-owned only
 */

export type DeepOpsLink = {
  deep_ops_project_code: string;
  deep_ops_milestone_number: number;
  deep_ops_deliverable_id: number;

  deep_ops_review_id?: number | null;

  linked_at: string;
};

export type PortalMilestoneReportOutcome = 'approved' | 'rejected';

export type PortalMilestoneReport = {
  id: string;
  report_version: number;

  created_at: string;
  created_by_user_id: string;

  deepOpsLink: DeepOpsLink;

  internal_outcome: PortalMilestoneReportOutcome;
  internal_notes?: string | null;

  pdf_storage_key: string;
  pdf_access_url?: string | null;

  snapshot: {
    deep_ops_fetched_at: string;

    project: {
      code: string;
      title?: string | null;
    };

    milestone: {
      number: number;
      title?: string | null;
      price?: number | null;
      status?: string | null;
    };

    deliverable: {
      deep_ops_deliverable_id: number;
      status?: string | null;
      description?: string | null;
      ticket?: string | null;
      requested_amount?: number | null;
      remaining_amount?: number | null;
      milestone_price?: number | null;
      created_at?: string | null;
    };
  };
};

export type PortalPartnerShareStatus = 'not_shared' | 'shared' | 'partner_responded' | 'error' | 'revoked';

export type PortalPartnerVerdict = 'approved' | 'rejected' | 'needs_changes' | 'comment_only';

export type PortalPartnerShareState = {
  report_id: string;

  partner_org_id?: string | null;

  share_status: PortalPartnerShareStatus;

  shared_at?: string | null;
  shared_by_user_id?: string | null;
  last_share_error?: string | null;

  partner_feedback: {
    verdict?: PortalPartnerVerdict | null;
    comment?: string | null;
    submitted_at?: string | null;
    submitted_by_partner_user_id?: string | null;
  };
};
