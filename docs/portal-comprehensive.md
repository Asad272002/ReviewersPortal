# Review Circle Portal – Comprehensive Documentation

## Overview

Review Circle is a role-based Next.js portal for Deep Funding reviewers, awarded teams, and administrators. It provides authentication, milestone review submission and PDF generation, team–reviewer assignments with chat, proposal voting, resources/guides/process documentation, and an admin management suite with CRUD.

## Roles & Login

- Admin
  - Full access to Admin Management, content CRUD, assignments, reviewer tests, and reports.
  - Authentication endpoints: `app/api/auth/route.ts:6`, verify at `app/api/auth/verify/route.ts:4`, logout at `app/api/auth/logout/route.ts:3`.
- Reviewer
  - Milestone review submission, reviewer tests, resources/guides/processes, proposal voting, chat with assigned teams.
  - Role normalization handled in `app/api/auth/route.ts:55-57`.
- Team (Awarded Team Leader)
  - Team dashboard, chat with assigned reviewers, view assignments; simplified UI.
  - Role-aware dashboard logic in `app/page.tsx:331-356`.

## Navigation & Sections

- Dashboard: Role-aware landing (`app/page.tsx`).
- Login: Username/password auth with JWT (`app/login/page.tsx`, `app/api/auth/*`).
- Milestone Report: Reviewer submission UI (`app/milestone-report/page.tsx`).
- Reviewer Tests: Quiz and submissions (`app/reviewer-tests/page.tsx`, `app/reviewer-tests/[id]/page.tsx`).
- Resources: Categorized materials (`app/resources/page.tsx`).
- Guides: Review guidelines (`app/guides/page.tsx`).
- Processes: Workflow documentation (`app/processes/page.tsx`).
- Support: Ticket submission (`app/support/page.tsx`).
- Voting: Proposal voting (`app/vote-proposals/page.tsx`).
- Assignments: Team–reviewer assignment view (`app/assignments/page.tsx`).
- Admin Management: Multi-tab admin suite (`app/admin-management/page.tsx`).

## Authentication

- Login flow:
  - POST `/api/auth` generates JWT and sets `token` cookie `app/api/auth/route.ts:61-85`.
  - GET `/api/auth/verify` validates cookie and returns user info `app/api/auth/verify/route.ts:15-27`.
  - POST `/api/auth/logout` clears cookie `app/api/auth/logout/route.ts:10-17`.
- Client guard and redirect logic in `app/login/page.tsx:22-27`.
- `AuthContext` provides session state to pages.

## Milestone Report Submission

- UI form with 4 criteria, weighted scoring, and accessible rating controls `app/milestone-report/page.tsx:296-336`.
- Rating legend and selection clarity `app/milestone-report/page.tsx:272-289`.
- Proposal selection is searchable for Title/Code with auto-fill:
  - Title combobox `app/milestone-report/page.tsx:195-213` (suggestions `app/milestone-report/page.tsx:214-232`).
  - Code combobox `app/milestone-report/page.tsx:214-232` (suggestions `app/milestone-report/page.tsx:233-251`).
- Projects API merges Supabase and `projectdetails.txt`: `app/api/projects/route.ts:1`.
- Submission POST `/api/milestone-reports/submit` stores data and generates PDF.
- PDF generation:
  - HTML built with weighted “Criteria Met” stat `lib/renderHtmlToPdf.ts:85-86, 170-174`.
  - Color-coded rating badges `lib/renderHtmlToPdf.ts:146-150`.
  - Puppeteer rendering `lib/renderHtmlToPdf.ts:182-196`.

## Awarded Teams Connect & Admin Management

- Admin Management aggregates multiple managers: `app/admin-management/page.tsx:10-19`.
- Awarded Teams Manager:
  - Lists teams/reviewers/assignments `app/components/admin/AwardedTeamsManager.tsx:74-92`.
  - Create team/reviewer/assignment via `/api/admin/awarded-teams` `app/api/admin/awarded-teams/route.ts:202-428`.
  - Inline edit of project code/title with update route `app/components/admin/AwardedTeamsManager.tsx:558-599` using `PUT /api/admin/awarded-teams/teams/[id]` `app/api/admin/awarded-teams/teams/[id]/route.ts:1`.
  - Assignment status updates `PUT /api/admin/awarded-teams/assignments/[id]` `app/api/admin/awarded-teams/assignments/[id]/route.ts:6-156`.

## Reviewer Tests

- Test index and detail pages: `app/reviewer-tests/page.tsx`, `app/reviewer-tests/[id]/page.tsx`.
- APIs:
  - GET `/api/reviewer-tests` list tests.
  - GET `/api/reviewer-tests/[id]` fetch a test.
  - POST `/api/reviewer-tests/[id]/submit` submit answers.
  - GET `/api/reviewer-tests/submissions` list submissions.

## Voting

- UI for proposals and voting `app/vote-proposals/page.tsx`.
- APIs: GET `/api/voting/proposals`, POST `/api/voting/vote`.
- Admin voting settings manager exists in admin suite.

## Resources, Guides, Processes, Documents

- Resources page lists categorized assets `app/resources/page.tsx`.
- Guides page provides reviewer guidance `app/guides/page.tsx`.
- Processes page hosts workflows/procedures `app/processes/page.tsx`.
- Documents page aggregates checklists and docs `app/documents/page.tsx`.

## Support

- End-user support page `app/support/page.tsx`.
- Admin Support Ticket Manager in admin suite with CRUD.

## Milestone Reports (Admin)

- View submitted milestone reports `app/components/admin/MilestoneReportsManager.tsx:32-87`.
- Open linked report outputs.

## Data & Storage

- Supabase: Admin APIs use `lib/supabase/server.ts:10` client with Service Role key.
- Google Drive/Sheets: Used where configured for storage and exports.

## UX & Visuals

- Three.js animated backgrounds across pages for visual consistency.
- Tailwind-based dark theme with purple accents.

## Security

- JWT cookie `token` with `httpOnly`, `sameSite` and secure flags.
- No secrets are committed in code paths; do not expose tokens.

## Quick Reference

- Login: `/login` → `POST /api/auth` → cookie → `GET /api/auth/verify`.
- Reviewer workflow: `/milestone-report` → submit → PDF.
- Team workflow: `/assignments` → chat via Awarded Teams Connect.
- Admin: `/admin-management` → manage content, teams, reviewers, assignments, tests, reports.

