# Reviewers Portal - Comprehensive Architecture & Flow Documentation

## 1. Overview
The Reviewers Portal is a specialized web application designed to manage the Request for Proposals (RFP) process. It serves four distinct user roles:
- **Admins**: Manage the entire ecosystem (users, announcements, resources, reviewer tests).
- **Reviewers**: Evaluate proposals, take qualification tests, and vote on projects.
- **Partners**: Oversee specific projects and review milestone reports submitted by teams.
- **Teams**: Submit proposals and milestone reports (limited access via specific workflows).

## 2. Technical Architecture

### 2.1 Technology Stack
- **Frontend Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom dark mode theme (`bg-[#0C021E]`)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom JWT-based auth system (not Supabase Auth)
- **State Management**: React Context (`AuthContext`) + Local State
- **Visuals**: Three.js (Login page animations), Framer Motion (UI transitions)
- **AI Integration**: Botpress Webchat (embedded in Login)

### 2.2 Project Structure
- **`app/`**: Application routes (Next.js App Router).
  - **`api/`**: Server-side API endpoints (Route Handlers).
  - **`(routes)`**: Page components (e.g., `login/`, `partner-dashboard/`).
- **`components/`**: Reusable UI components.
  - **`admin/`**: Admin-specific management components.
- **`lib/`**: Core logic and utilities.
  - **`supabase/`**: Database service layer (`service.ts`, `client.ts`).
  - **`auth/`**: Authentication helpers.
- **`context/`**: Global state providers (`AuthContext`, `MotionContext`).

## 3. Authentication & Security

### 3.1 The Login Mechanism
The portal uses a custom-built authentication system designed to unify multiple user sources (Partners, Awarded Teams, Reviewers/Admins) into a single login flow while maintaining strict separation of concerns.

#### **Step-by-Step Flow:**
1.  **User Interface (`app/login/page.tsx`)**:
    - Users enter Username & Password.
    - A toggle switch "Login to Partner Portal" sets the `isPartnerLogin` flag.
    - `useAuth().login()` is called.

2.  **Client State (`app/context/AuthContext.tsx`)**:
    - Sends a `POST` request to `/api/auth` with credentials and the `isPartnerLogin` flag.

3.  **Backend Validation (`app/api/auth/route.ts`)**:
    - **Role Normalization**: Checks credentials against three database tables via `supabaseService.validateUserCredentials`:
        1.  **`partners`**: Checks directly for partner accounts.
        2.  **`awarded_team`**: Checks for team accounts (priority).
        3.  **`user_app`**: Checks for admins, reviewers, and teams (fallback).
    - **Strict Login Separation**:
        - If `isPartnerLogin` is **true**: User **MUST** have the 'partner' role. Non-partners are rejected.
        - If `isPartnerLogin` is **false**: User **MUST NOT** be a partner. Partners trying to use the standard login are rejected.

4.  **Token Generation**:
    - Upon validation, a **JWT (JSON Web Token)** is signed using `jose`.
    - Payload includes: `userId`, `username`, `name`, `role`.
    - **Security**: The token is stored in an **HTTP-Only, Secure, SameSite** cookie named `token`. This prevents XSS attacks from accessing the token via JavaScript.

5.  **Session Management**:
    - **`middleware.ts` / API Checks**: Incoming requests to API routes verify the JWT from the cookie.
    - **Client-Side Protection**: `app/components/ProtectedRoute.tsx` wraps sensitive pages. It checks the global `AuthContext` state and redirects unauthenticated users or users with invalid roles.

### 3.2 Key Security Techniques
- **HttpOnly Cookies**: Prevents client-side scripts from reading the auth token.
- **Role-Based Access Control (RBAC)**:
    - **Frontend**: `ProtectedRoute` component ensures only authorized roles render specific pages (e.g., `allowedRoles={['partner']}`).
    - **Backend**: API routes perform server-side role checks before returning data.
- **Strict Role Separation**: The `isPartnerLogin` flag enforces a hard boundary between Partner workflows and Reviewer/Admin workflows, preventing role confusion.

## 4. Core Workflows

### 4.1 Partner Dashboard Flow
1.  **Access**: Partners login via the dedicated toggle.
2.  **Dashboard (`app/partner-dashboard/page.tsx`)**:
    - Fetches data from `/api/partners/dashboard`.
    - **Data Aggregation**: Backend joins `partners` -> `organization` -> `project_milestones` -> `milestone_review_reports`.
    - **UI**: Displays Pending Reviews, Recent Reports, and All Projects using a tabbed interface.
3.  **Review Process**:
    - Partners view milestone reports submitted by teams.
    - Actions: **Approve** or **Reject** with comments.
    - Submission sends `POST` to `/api/partners/review`, updating the report status in the database.

### 4.2 Reviewer Tests Flow
1.  **Admin Management**: Admins create/edit tests via `ReviewerTestsManager.tsx`.
2.  **Reviewer Access**: Reviewers navigate to `/reviewer-tests`.
3.  **Session Tracking**:
    - Start Test: Calls `/api/reviewer-tests/[id]/start` to create an `in_progress` session.
    - Prevents multiple concurrent attempts or retaking completed tests.
4.  **Submission**:
    - Answers are submitted to `/api/reviewer-tests/[id]/submit`.
    - System auto-grades (if applicable) or marks for manual review.

### 4.3 Milestone Reporting (Teams)
1.  **Submission**: Teams (or Admins on their behalf) submit reports via `/milestone-report`.
2.  **Data Handling**: Reports are stored in `milestone_review_reports`.
3.  **Notification**: A success modal prompts users to also fill out an external Google Operations Form (integration point).

## 5. Data Flow Architecture

1.  **Database (Supabase)**: The single source of truth.
    - Tables: `user_app`, `partners`, `awarded_team`, `milestone_review_reports`, `reviewer_tests`, `votes`, etc.
2.  **Service Layer (`lib/supabase/service.ts`)**:
    - Abstracts raw Supabase queries.
    - Handles complex joins and data normalization.
    - Implements **Caching** (via `lib/cache.ts`) for high-read data like Proposals and Voting Results to reduce database load.
3.  **API Layer (Next.js Route Handlers)**:
    - Exposes RESTful endpoints (e.g., `GET /api/partners/dashboard`).
    - Handles request validation, auth verification, and response formatting.
4.  **Client Layer (React Components)**:
    - Fetches data via `fetch` calls to the internal API.
    - Uses `useState` / `useEffect` for data binding.
    - Uses `useMemo` for client-side filtering and sorting (e.g., Partner Dashboard tabs).

## 6. Deployment
- **Platform**: Vercel.
- **Environment**: Production builds optimize assets and strip dev-only logic.
- **Configuration**: `next.config.ts` handles build settings (e.g., `eslint.ignoreDuringBuilds`).
