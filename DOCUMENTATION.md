# Reviewers Portal Documentation

## Overview
The Reviewers Portal is a comprehensive platform designed to manage the workflow between project reviewers, admins, and awarded teams. It facilitates the submission of milestone reports, voting on proposals, resource sharing, and direct communication between reviewers and teams.

## User Roles

### 1. Admin
- **Access Level**: Full system access.
- **Key Responsibilities**:
    - Manage users (Reviewers, Team Leaders).
    - Configure system settings (Voting, Tests).
    - Oversee all content (Announcements, Resources, Processes).
    - Manage Awarded Teams and assign reviewers.
    - View global analysis and statistics.
    - Handle support tickets.

### 2. Reviewer
- **Access Level**: Restricted to assigned tasks and general resources.
- **Key Responsibilities**:
    - Review assigned teams and proposals.
    - Submit milestone review reports.
    - Vote on proposals.
    - Take reviewer qualification tests.
    - Chat with assigned teams.
    - View personal performance analysis.

### 3. Team (Awarded Team)
- **Access Level**: Limited to team-specific data.
- **Key Responsibilities**:
    - View assigned reviewer.
    - Chat with the reviewer.
    - (Potential) View project status.

---

## Features & Functionality

### Authentication
- **Login**: Secure login using username and password.
- **Security**: JWT (JSON Web Token) based authentication with role-based access control (RBAC).
- **Session**: Persisted via HTTP-only cookies.

### 1. Unified Dashboard
The landing page for all users, featuring a dynamic Three.js particle background.
- **Quick Links**: Access to Announcements, Documents, Resources, and Voting.
- **Motion Control**: Toggle for 3D background animations for performance/accessibility.

### 2. Admin Management Portal (`/admin-management`)
A centralized hub for all administrative tasks.

*   **Data Overview**: Real-time stats on announcements, resources, users, and tickets.
*   **Manage Announcements**: Create, edit, and delete system-wide announcements.
*   **Manage Resources**: Upload and manage files/links for reviewers.
*   **Manage Process Documentation**: Maintain guides and workflow documents.
*   **Awarded Teams Connect**:
    *   Assign reviewers to specific teams.
    *   Monitor chat sessions between reviewers and teams.
*   **Awarded Teams Info**:
    *   Database of all awarded teams.
    *   **Filter by Round**: Organize teams by funding round.
    *   Modern Card View with search functionality.
*   **Milestone Reports**: View and review reports submitted by reviewers.
*   **Manage Users**: Add/Edit/Remove users and assign roles.
*   **Support Tickets**: Track and resolve user-submitted support requests.
*   **Voting Settings**: Configure voting parameters (duration, change limits, quorum).
*   **Reviewer Tests**: Create and manage qualification quizzes for reviewers.

### 3. Reviewer Features

*   **My Assignments** (`/assignments`):
    *   View assigned Awarded Teams.
    *   **Integrated Chat**: Direct messaging with the team leader.
*   **Milestone Report Submit** (`/milestone-report`):
    *   Form to submit reviews for specific milestones.
    *   Validation for links and required fields.
*   **Vote for Proposals** (`/vote-proposals`):
    *   Participate in governance by voting on active proposals.
*   **Reviewer Test** (`/reviewer-tests`):
    *   Take quizzes to validate knowledge and eligibility.
*   **Analysis** (`/analysis`):
    *   **Personal Stats**: View total reports submitted, approval/rejection rates.
    *   **Charts**: Visual breakdown of verdicts.
    *   **History**: List of recent submissions with links to documents.

### 4. Shared Features

*   **Announcements** (`/announcements`): News feed for the community.
*   **Requirement Documents** (`/documents`): Official specs and guidelines.
*   **Resources** (`/resources`): Helpful tools and links.
*   **Process Documentation** (`/processes`): Standard Operating Procedures (SOPs).
*   **Contact & Support** (`/support`): Submit tickets for technical issues.

### 5. Analysis & Analytics
*   **Reviewer View**: Personal performance metrics.
*   **Admin View**:
    *   **Global Overview**: Aggregate data of all reviewers.
    *   **Leaderboard**: Table showing top reviewers by activity.
    *   **Toggle**: Switch between personal and global stats.

---

## Technical Stack

*   **Frontend**: Next.js 14 (React), TypeScript, Tailwind CSS.
*   **Backend**: Next.js API Routes (Serverless).
*   **Database**: Supabase (PostgreSQL).
*   **Authentication**: Custom JWT implementation + Supabase Auth helpers.
*   **Visualization**: Recharts (Charts), Three.js (3D Backgrounds).
*   **Styling**: Custom CSS variables (globals.css) + Tailwind utility classes.
*   **Icons**: Custom SVG icons.

## Directory Structure
- `app/`: Main application code (Next.js App Router).
    - `api/`: Backend API endpoints.
    - `components/`: Reusable UI components.
        - `admin/`: Admin-specific managers.
    - `context/`: React Context (Auth).
    - `[feature]/`: Page routes (e.g., `analysis`, `login`).

## Recent Updates
- **Global Analysis**: Admins can now view system-wide statistics.
- **Awarded Teams UI**: Modernized with card layout and round filtering.
- **Analysis Page**: Added dedicated page for performance tracking.
