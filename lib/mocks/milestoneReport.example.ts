import type { PortalMilestoneReport, PortalPartnerShareState } from '../types/milestoneReports';

export const examplePortalMilestoneReport: PortalMilestoneReport = {
  id: 'mrpt_example_001',
  report_version: 1,
  created_at: '2026-03-01T12:00:00Z',
  created_by_user_id: 'user_admin_example',
  deepOpsLink: {
    deep_ops_project_code: 'DF-EXAMPLE-001',
    deep_ops_milestone_number: 1,
    deep_ops_deliverable_id: 123,
    linked_at: '2026-03-01T12:00:00Z',
  },
  internal_outcome: 'approved',
  internal_notes: 'Meets deliverables; evidence accessible; budget aligned.',
  pdf_storage_key: 'milestone-reports/DF-EXAMPLE-001/m1/report_v1.pdf',
  pdf_access_url: null,
  snapshot: {
    deep_ops_fetched_at: '2026-03-01T11:59:58Z',
    project: {
      code: 'DF-EXAMPLE-001',
      title: 'Example Project',
    },
    milestone: {
      number: 1,
      title: 'Milestone 1',
      price: 17000,
      status: 'submitted',
    },
    deliverable: {
      deep_ops_deliverable_id: 123,
      status: 'submitted',
      description: 'Deliverable link + summary for Milestone 1',
      ticket: 'OPS-101',
      requested_amount: 5000,
      remaining_amount: 12000,
      milestone_price: 17000,
      created_at: '2026-02-28T09:00:00Z',
    },
  },
};

export const examplePortalPartnerShareState: PortalPartnerShareState = {
  report_id: 'mrpt_example_001',
  partner_org_id: 'org_partner_example',
  share_status: 'shared',
  shared_at: '2026-03-02T10:00:00Z',
  shared_by_user_id: 'user_admin_example',
  partner_feedback: {
    verdict: null,
    comment: null,
    submitted_at: null,
    submitted_by_partner_user_id: null,
  },
};
