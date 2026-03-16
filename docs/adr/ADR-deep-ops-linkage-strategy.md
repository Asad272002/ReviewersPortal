# ADR: Deep Ops Linkage Strategy for Portal Milestone Reports

## Status
Accepted

## Context
The Review Circle Portal generates and stores milestone review report PDFs and supports a partner-sharing workflow. Deep Ops provides operational data (deliverables, milestones, reviews, awarded projects).

We need a durable linkage strategy that:
- allows the portal to reference the correct Deep Ops operational record
- avoids over-coupling the portal to Deep Ops review modeling and future v2 changes
- preserves historical accuracy of portal-generated PDFs even if Deep Ops data changes later

## Decision

### 1) Deliverable-centered linkage is the primary join
For each portal milestone report we store a required linkage set:
- `deep_ops_project_code`
- `deep_ops_milestone_number`
- `deep_ops_deliverable_id`

This is sufficient to map a portal report to the operational deliverable being reviewed.

### 2) `deep_ops_review_id` is optional enrichment
We may store `deep_ops_review_id` if it is available and stable, but it is not required for correctness.
The portal must not depend on Deep Ops review identity to function or to locate the correct deliverable context.

### 3) Snapshots are immutable per report_version
At the moment a PDF is generated, the portal stores an immutable snapshot of relevant operational fields.
If a report is regenerated/replaced, it increments `report_version` and captures a new snapshot.

### 4) Partner verdicts remain portal-owned
Partner verdict/comments are portal-owned workflow artifacts and must not be assumed to update Deep Ops review/audit state.

## Consequences
- The portal remains resilient to Deep Ops changes in review modeling and v2 migrations.
- Historical reports remain auditable and stable without requiring Deep Ops to preserve old operational states.
- Integration can begin read-only and gradually enrich over time without breaking portal behavior.

## References
- `docs/integrations/deep-ops-milestone-report-architecture.md`
- `docs/integrations/deep-ops-field-mapping.md`
- `lib/types/milestoneReports.ts`

