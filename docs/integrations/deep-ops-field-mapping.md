# Deep Ops → Portal Field Mapping Contract (Milestone Reports)

## Purpose
This mapping contract standardizes how Deep Ops operational fields map into:
- portal linkage fields (for joining records)
- portal snapshot fields (for immutable historical stability)
- portal partner workflow fields (portal-only)

Tags used:
- **REQUIRED NOW**: needed for Phase 1
- **OPTIONAL LATER**: deferred enrichment/analytics
- **PORTAL-ONLY**: must not be assumed to exist in Deep Ops
- **DEEP-OPS-ONLY**: operational field not stored unless snapshotted/enriched

## 1) Portal Linking Fields (DeepOpsLink)

| Portal field | Source | Tag | Notes |
|---|---|---|---|
| `deep_ops_project_code` | Deep Ops deliverable/review/milestone update | REQUIRED NOW | Stable natural key for project identity |
| `deep_ops_milestone_number` | Deep Ops deliverable/review/milestone update | REQUIRED NOW | Links portal report to the milestone within the project |
| `deep_ops_deliverable_id` | Deep Ops deliverable record | REQUIRED NOW | Primary operational record the report refers to |
| `deep_ops_review_id` | Deep Ops review record | OPTIONAL LATER | Enrichment only; not required for correctness |
| `linked_at` | Portal generated | REQUIRED NOW, PORTAL-ONLY | When the portal established the linkage/snapshot |

## 2) Portal Snapshot Fields (immutable per report_version)

### Project snapshot
| Portal snapshot field | Deep Ops source | Tag | Notes |
|---|---|---|---|
| `snapshot.project.code` | `DeliverableRecord.project_code` | REQUIRED NOW | Must match linkage |
| `snapshot.project.title` | `DeliverableRecord.project_title` | OPTIONAL LATER | Useful for display; can change over time in Deep Ops |

### Milestone snapshot
| Portal snapshot field | Deep Ops source | Tag | Notes |
|---|---|---|---|
| `snapshot.milestone.number` | `DeliverableRecord.milestone_number` | REQUIRED NOW | Must match linkage |
| `snapshot.milestone.title` | `MilestoneResponse.title` | OPTIONAL LATER | Only if you read per-project milestones |
| `snapshot.milestone.price` | `MilestoneResponse.price` or `DeliverableRecord.milestone_price` | OPTIONAL LATER | Prefer milestone record when available |
| `snapshot.milestone.status` | `MilestoneResponse.status` or external updated-milestones `milestone_status` | OPTIONAL LATER | Keep as opaque string |

### Deliverable snapshot
| Portal snapshot field | Deep Ops source | Tag | Notes |
|---|---|---|---|
| `snapshot.deliverable.deep_ops_deliverable_id` | `DeliverableRecord.deliverable_id` | REQUIRED NOW | Mirrors linkage |
| `snapshot.deliverable.status` | `DeliverableRecord.status` | OPTIONAL LATER | Keep as opaque string |
| `snapshot.deliverable.description` | `DeliverableRecord.description` | OPTIONAL LATER | Capture what the reviewer saw |
| `snapshot.deliverable.ticket` | `DeliverableRecord.ticket` | OPTIONAL LATER | Useful for ops traceability |
| `snapshot.deliverable.requested_amount` | `DeliverableRecord.requested_amount` | OPTIONAL LATER | Numeric operational context |
| `snapshot.deliverable.remaining_amount` | `DeliverableRecord.remaining_amount` | OPTIONAL LATER | Numeric operational context |
| `snapshot.deliverable.milestone_price` | `DeliverableRecord.milestone_price` | OPTIONAL LATER | Numeric operational context |
| `snapshot.deliverable.created_at` | `DeliverableRecord.created_at` | OPTIONAL LATER | Helps explain timing |
| `snapshot.deep_ops_fetched_at` | Portal generated | REQUIRED NOW, PORTAL-ONLY | Ensures the snapshot is anchored in time |

## 3) Partner Workflow Fields (PortalPartnerShareState) (PORTAL-ONLY)

| Portal field | Source | Tag | Notes |
|---|---|---|---|
| `report_id` | Portal report | REQUIRED NOW, PORTAL-ONLY | Primary join back to PortalMilestoneReport |
| `partner_org_id` | Portal org mapping | PORTAL-ONLY | Required when `share_status` is `shared` or later; determined by portal organization/project relationship |
| `share_status` | Portal workflow | REQUIRED NOW, PORTAL-ONLY | Status-based share state: not_shared/shared/partner_responded/error/revoked |
| `shared_at` | Portal event | PORTAL-ONLY | Required when `share_status` is `shared` or later |
| `shared_by_user_id` | Portal user | PORTAL-ONLY | Required when `share_status` is `shared` or later |
| `last_share_error` | Portal event | OPTIONAL LATER, PORTAL-ONLY | Troubleshooting without leaking secrets |
| `partner_feedback.verdict` | Partner user input | PORTAL-ONLY | Required when feedback exists; must not imply Deep Ops state changes |
| `partner_feedback.comment` | Partner user input | PORTAL-ONLY | Required when feedback exists; freeform feedback |
| `partner_feedback.submitted_at` | Portal event | PORTAL-ONLY | Required when feedback exists; timestamp of partner submission |
| `partner_feedback.submitted_by_partner_user_id` | Portal partner identity | PORTAL-ONLY | Required when feedback exists; partner actor identity |

## 4) Deep Ops Fields Not Stored by Default (DEEP-OPS-ONLY)
Unless explicitly snapshotted, the portal does not store:
- payment dashboards and audit payment metadata
- global analytics datasets
- tasks/bug reports

## 5) TODO Markers for Future Integration (No Wiring Yet)
- TODO: When generating a portal PDF report, capture DeepOpsLink + snapshot atomically
- TODO: Admin Management listing may display Deep Ops linkage metadata for diagnostics
- TODO: Share-to-partner creates/updates PortalPartnerShareState only (portal-owned)
- TODO: Optional enrichment service may fill `deep_ops_review_id` and additional IDs (never required)
- TODO: Milestone-feed source of truth (read-only): use `GET /api/v1/external/milestones/updated-milestones` for milestone update context

