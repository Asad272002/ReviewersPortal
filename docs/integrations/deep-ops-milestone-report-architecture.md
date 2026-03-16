# Deep Ops ↔ Review Circle Portal: Milestone Report Architecture (Design Note)

## Purpose
This note captures the agreed architecture boundary and data-linking strategy between:
- Deep Ops (operations system of record)
- Review Circle Portal (review artifact + partner workflow system of record)

This document is intentionally implementation-light. It defines what we will build toward later without wiring any live integration yet.

## System Boundary (Final)

### Deep Ops owns (operational source of truth)
- Awarded projects and operational project metadata
- Milestones and milestone status
- Deliverables and deliverable status
- Reviews as operational records (optional for portal linkage)
- Updated-milestones feed (external)

### Review Circle Portal owns (artifact + partner workflow source of truth)
- Internal milestone review workflow UI and decision capture
- PDF milestone review report generation and formatting
- Milestone report storage, display, and admin listing
- Share-to-partner workflow routing and access control
- Partner-side verdict/comment workflow and history

## Two-Stage Workflow Model (Final)

### Stage 1: Internal milestone review workflow (portal-owned)
- Reviewer/coordinator/admin reviews an assigned milestone deliverable
- Approve/reject decision is recorded in the portal
- Portal generates a formatted PDF milestone review report
- Portal stores the report and associated metadata

### Stage 2: Partner-sharing workflow (portal-owned)
- Coordinator/admin shares an existing portal milestone report to the partner side
- Partner views the report and provides verdict/comments in the partner portal
- Partner verdict/comments remain portal-owned and do not assume updates to Deep Ops

## Linkage Strategy (Final)

### Required linkage fields (portal → Deep Ops)
Every portal milestone report that corresponds to a Deep Ops deliverable MUST store:
- `deep_ops_project_code`
- `deep_ops_milestone_number`
- `deep_ops_deliverable_id`

### Why `deep_ops_review_id` is optional
Deep Ops review objects may not be 1:1 with portal milestone reports over time (or may evolve in v2).
To avoid coupling portal correctness to Deep Ops review identity, we:
- treat `deep_ops_review_id` as optional enrichment
- keep the primary linkage deliverable-centered (project_code + milestone_number + deliverable_id)

This ensures the portal remains functional and historically correct even if Deep Ops review modeling changes.

## Immutable Snapshot Rationale (Final)
At the moment a portal PDF report is generated, the portal should store an immutable snapshot of the relevant operational fields that informed the report.

Why:
- Deep Ops operational data may change later (status, amounts, links, metadata)
- The portal report must remain historically stable and auditable
- The portal should be able to re-display the exact context the PDF asserts, independent of later Deep Ops updates

Snapshot principles:
- write-once for a given `report_version`
- versioned if report regeneration/replacement is allowed
- sufficient to explain the report content without re-querying Deep Ops

## Portal-Owned Partner Workflow Rationale (Final)
Partner verdict/comments are portal-owned only.
We do not assume they should update Deep Ops review/audit state because:
- partner feedback is a communication/workflow layer, not necessarily an operational accounting mutation
- enforcing a Deep Ops update would couple partner UX to Deep Ops availability/semantics
- the portal can support partner review history even if Deep Ops review state is immutable or differently modeled

## Phase 1 Schema (Final)
These are the stable types the codebase should reuse. Phase 1 is intentionally minimal and avoids database coupling decisions.

### DeepOpsLink (Phase 1)
- required: deliverable-centered linkage
- optional: review_id enrichment

### PortalMilestoneReport (Phase 1)
- owns PDF artifact references and the immutable snapshot
- stores Deep Ops linkage fields (via DeepOpsLink)

### PortalPartnerShareState (Phase 1)
- share_status-based share state + partner feedback
- portal-owned only

See the canonical TypeScript types in:
- `lib/types/milestoneReports.ts`

## Optional Phase 2 Fields (Future)
These fields are explicitly deferred until integration/analytics needs become concrete:
- additional Deep Ops IDs (`deep_ops_project_id`, `deep_ops_milestone_id`, etc.)
- view-tracking analytics fields (first_viewed_at, last_viewed_at, view_count, notifications)
- supersession metadata (replaces_report_id, replaced_by_report_id, report status)
- integrity metadata (snapshot_hash)

## Read-Only Endpoint Recommendations (Safe Now)
Authentication supports either `X-API-Key` or bearer tokens; for the portal we intend to keep API keys server-side only.

Recommended GET endpoints to validate access and read operational context:
- `GET /api/v1/auth/profile`
- `GET /api/v1/deliverables/` (filters: `status`, `project_code`, `date_from`, `date_to`, `offset`, `limit`)
- `GET /api/v1/deliverables/{deliverable_id}`
- `GET /api/v1/reviews` (filters: `status`, `project_code`, `reviewer_id`, `coordinator_id`, `milestone_id`, `date_from`, `date_to`, `offset`, `limit`)
- `GET /api/v1/reviews/{review_id}`
- `GET /api/v1/external/milestones/updated-milestones?start_date&end_date`
- `GET /api/v1/projects/{project_id}/milestones?include_deleted=...`

### Milestone-feed availability note (read-only)
For the currently verified account/API key and integration use case:
- `GET /api/v1/external/milestones/updated-milestones` is the milestone-update feed to rely on (same feed used by the main Deep site)
- `GET /api/v1/updated-milestones` should not be treated as important for this integration (likely deprecated and/or not configured properly for RBAC)

## Write Endpoints Explicitly Deferred (Do Not Use Yet)
These exist in Deep Ops but are not part of Phase 1 portal integration:
- `POST /api/v1/deliverables/`
- `POST /api/v1/reviews` (multipart upload)
- `PATCH /api/v1/reviews/{review_id}/audit`
- milestone mutation endpoints under `/api/v1/projects/{project_id}/milestones...`

## TODO: Future Integration Points (No Wiring Yet)
- TODO: Stage 1 (internal) milestone report generation flow should optionally capture Deep Ops linkage + snapshot when generating the PDF
- TODO: Admin Management milestone report listing can optionally display Deep Ops linkage metadata (project_code, milestone_number, deliverable_id)
- TODO: Share-to-partner action should create/update PortalPartnerShareState only (portal-owned)
- TODO: Future read-only Deep Ops sync service (server-side) for:
  - recently updated milestones reconciliation
  - optional enrichment of portal reports with non-essential Deep Ops fields
- TODO: Optional `deep_ops_review_id` enrichment path:
  - only if/when a stable 1:1 mapping is confirmed operationally
  - never required for correctness
