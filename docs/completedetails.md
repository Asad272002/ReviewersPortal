Reviewers Portal
Consolidated Master Structure Document
1. Purpose and Overview

The Reviewers Portal is a comprehensive internal platform built for the Deep Funding Review Circle to manage and coordinate all review-circle-related activities in one place.

It supports operational workflows between:

Admins / Coordinators

Reviewers

Awarded Teams

Partners

Its goal is to centralize review operations, milestone processing, communication, governance, documentation, support, testing, and analytics in a single structured environment.

The portal is designed to handle:

internal reviewer coordination

milestone review submissions

proposal and requirement-document voting

team–reviewer communication

partner verdict workflows

operational documentation

support requests

reviewer tests

analytics and performance tracking

future reputation and quality-assurance systems

2. Core User Roles and Access Model

The portal supports multiple user roles with distinct permissions and interfaces.

A. Admin / Coordinator

Access Level: Full system access

Responsibilities and Capabilities:

Controls all activities across the portal

Performs CRUD operations for all major modules

Manages users, including reviewers and team leaders

Configures system settings such as voting and tests

Oversees announcements, resources, processes, and guides

Assigns reviewers to awarded teams

Monitors and participates in anonymized team–reviewer chats when needed

Terminates chat sessions when required

Reviews global analysis and platform-wide statistics

Manages milestone reports

Handles support tickets

Accesses a dedicated Admin Management section for centralized control

B. Reviewer

Access Level: Restricted to assigned work plus shared portal resources

Responsibilities and Capabilities:

Reviews assigned teams and proposals

Submits milestone review reports

Participates in governance through proposal voting

Submits and interacts with Idea Box (RD) Proposals

Takes reviewer qualification tests

Chats with assigned awarded teams

Accesses announcements, resources, Idea Boxes, and process documentation

Uses contact/support to raise issues

Views personal analysis and performance metrics

C. Team / Awarded Team / Team Leader

Access Level: Limited to team-specific functions

Responsibilities and Capabilities:

Uses a dedicated team dashboard

Connects with assigned reviewer through the Awarded Teams Connect function

Communicates with reviewer in an anonymized chat

Resolves milestone issues

Shares resources and clarifications related to submissions

Potentially views project status

Does not see the reviewer’s real identity

Important Behavior:

Teams only access reviewer communication after a coordinator assigns them to a specific reviewer

Chat is anonymized and overseen by the coordinator

D. Partner (MVP phase)

Access Level: Milestone-verdict access for assigned organizations/projects

Responsibilities and Capabilities:

Accesses milestone reviews completed by reviewers

Reviews submitted milestone reports

Gives final verdicts on milestone reports:

Approve

Reject

Each partner may be assigned an organization

Each organization may have multiple project codes

Milestone reports for those project codes are routed to the appropriate partner(s)

UX Intent

Admins: full dashboard and management access

Reviewers: reviewer-specific workflow and assignments

Team Leaders / Awarded Teams: team-only dashboard and reviewer communication

Partners: milestone verdict workflows for assigned organizations/projects

4. Authentication and Security
Supported Login Methods

Username + Password

Continue with Deep ID button for DEEP-ID-based login

Security Model

Secure authentication

JWT (JSON Web Token) based authentication

Role-Based Access Control (RBAC)

Session persistence via HTTP-only cookies

Authentication Flow Components Mentioned

Token verification

Protected routes

User context management

Additional Note

The Deep ID login is explicitly intended to allow users to access the portal using their Deep IDs.

5. Main Portal Experience
Unified Dashboard

The main landing page is a unified dashboard with dynamic behavior depending on the user role.

Shared Dashboard Characteristics

Dynamic Three.js particle background

Quick links to:

Announcements

Documents

Resources

Voting

Motion toggle for 3D background animations for:

performance

accessibility

Role-Based Behavior

Different users see different dashboard functions and navigation items depending on their assigned role.

6. Primary Functional Modules
6.1 Admin Management Portal

Route: /admin-management

This is the central administrative control hub.

Some Core Admin Functions

Data Overview

Real-time stats on announcements, resources, users, and tickets

Manage Announcements

Create, edit, delete system-wide announcements

Manage Resources

Upload and manage files and links

Manage Process Documentation

Maintain SOPs, workflows, guides, and operating procedures

Manage Users

Add, edit, remove users and assign roles

Support Tickets

Track and resolve submitted support requests

Voting Settings

Configure voting duration, limits, quorum, minimum votes, auto-close logic

Reviewer Tests

Create and manage reviewer qualification quizzes

Milestone Reports

View and review milestone reports submitted by reviewers

Awarded Teams Info

Maintain a database of awarded teams

Filter by funding round

Use a modern card view with search

Awarded Teams Connect

Assign reviewers to teams

Monitor anonymized team–reviewer chat sessions

Chat Oversight

Admins can:

observe chats

intervene when necessary

participate in conversations

terminate chats when appropriate

6.2 Awarded Teams Connect

This is a central collaboration feature connecting Awarded Teams with assigned Reviewers.

Purpose

To let teams and reviewers communicate around milestone-related issues without exposing reviewer identity.

Core Properties

Reviewer assigned by coordinator/admin

Fully anonymized chat

Coordinator oversight

Admin participation when required

Chat can be terminated by coordinator

Usage

Teams can:

resolve issues

ask questions

share resources

discuss milestone-related needs

Reviewers can:

clarify expectations

guide teams

request supporting information

6.3 My Assignments

Route: /assignments

Reviewer Use

View assigned awarded teams

Access integrated chat with the team leader

See assignment-specific context

Team Use

View reviewer connection (without identity disclosure)

Communicate within assigned chat sessions

6.4 Milestone Report Submit

Route: /milestone-report

This is the page where reviewers submit milestone review reports for milestone deliverables submitted by awarded teams.

Core Functions

Structured review form

Submit milestone-specific evaluations

Required field validation

Link validation

Report generation workflow

Special Output

When a milestone report is submitted, the system generates a specifically styled PDF formatted report.

PDF Behavior

The PDF is formatted in a predefined style

The format can be changed and modified according to operational need

6.5 Idea Box

Route: /documents

This module is used for official documents and also serves a governance function inside the review circle.

Two Referenced Uses

Official Specs and Guidelines

Idea Box Proposals (RD Proposals) submitted by reviewers inside the review circle

Review Circle Proposal Use

Reviewers can submit RD proposals

Other reviewers can view them

Those proposals can be voted on through the Vote for Proposals module

6.6 Vote for Proposals

Route: /vote-proposals

This module is used for governance and review-circle decision-making.

Functions

Vote on active proposals

Participate in governance decisions

Support voting around:

review-circle proposals

RD proposals

potentially other internal governance items

Configurable Settings

Admins can define:

voting duration

change limits

quorum

minimum vote requirements

auto-close behavior

6.7 Reviewer Tests

Route: /reviewer-tests

This module manages reviewer qualification and assessment.

Functions

Reviewers take tests/quizzes

Admins create and manage tests

Used to validate reviewer knowledge and eligibility

Example Test Mentioned

MQA Milestone Quality Assurance Test

10 MCQs

5 scenario-based questions

15-minute timer

Purpose

assess knowledge

validate process understanding

check readiness for internal review duties

6.8 Announcements

Route: /announcements

Purpose

A shared news feed for the review-circle community.

Content

platform updates

internal notices

governance updates

process changes

operational news

Admins can create, edit, and delete announcements.

6.9 Resources

Route: /resources

Purpose

A shared library of:

helpful tools

links

files

reference material

Admins manage this content for reviewers and portal users.

6.10 Process Documentation

Route: /processes

Purpose

This page stores:

standard operating procedures

internal review-circle processes

portal usage processes

guidance documents

Users can consult it for operational guidance.

6.11 Contact & Support

Route: /support

Purpose

Allows users to submit tickets for:

technical issues

access problems

portal questions

operational support needs

Admins can track and resolve these support tickets.

6.12 GitBook Chatbot

A GitBook chatbot is integrated so users can ask questions directly from the Review Circle GitBook content.

Purpose

quick reference support

documentation Q&A

process guidance via chatbot interaction

7. Analysis and Analytics

The portal includes a dedicated Analysis function for both reviewers and admins.

Analysis Access

A visible Analysis button is listed on:

coordinator/admin profiles

reviewer profiles

Reviewer Analysis View

Personal statistics

Total milestone reports submitted

Approval rate

Rejection rate

Charts showing verdict breakdown

Submission history

Links to related documents

Admin Analysis View

Global overview of all reviewer activity

Aggregate milestone report statistics

Approval/rejection metrics system-wide

Leaderboard of top reviewers by activity

Toggle between personal and global stats

Referenced Metrics

total milestone reports submitted

approval rate

rejection rate

recent history

reviewer activity leaderboard

8. Communication System

The portal includes an integrated communication layer focused primarily on reviewer–team collaboration.

Core Communication Features

Direct messaging between assigned parties

Session-based chat system

Message tracking

Admin monitoring

Identity anonymization for reviewers

Key Rules

Reviewer identity remains hidden from teams

Coordinators can oversee and intervene

Chat is structured around assignments

Sessions may be terminated by admin/coordinator

9. Workflow Summary
9.1 Proposal Submission Workflow (Earlier WebStart Architecture)

Team leaders submit proposals

Proposal data is stored

Proposals become available for voting

9.2 Voting Workflow

Users access active proposals

Votes are recorded

Voting results are aggregated

Voting settings control close conditions and thresholds

9.3 Awarded Teams Workflow

Winning/awarded teams are identified

Reviewers are assigned to teams

Chat sessions are initiated

Collaboration occurs around deliverables/milestones

Progress is tracked through assignments and review actions

9.4 Milestone Review Workflow

Awarded team submits milestone deliverable (external or connected process)

Reviewer evaluates deliverable

Reviewer submits milestone report via portal

Portal generates formatted PDF report

If the project falls under a partner organization:

the report is routed to the relevant partner

Partner reviews the report and gives final verdict:

approve

reject

9.5 Support Workflow

User submits support ticket

Admin tracks and resolves issue

Operational or technical guidance is provided

10. Technical Architecture

The provided details reflect multiple versions / phases of the project. Both are consolidated below.

10.1 Modern Stack (Current/Main Reviewers Portal Direction)

Frontend: Next.js 14 (React), TypeScript, Tailwind CSS

Backend: Next.js API Routes (serverless)

Database: Supabase (PostgreSQL)

Authentication: Custom JWT implementation + Supabase auth helpers

Visualization: Recharts, Three.js

Styling: Tailwind CSS + custom CSS variables (globals.css)

Icons: Custom SVG icons

10.2 WebStart / Earlier Architecture Variant

A related or earlier analyzed architecture referred to the project as WebStart and described:

Frontend: Next.js 15, React, TypeScript, Tailwind CSS, Three.js

Backend: Next.js API Routes + Google Sheets API

Database: Google Sheets used as database

Authentication: Custom JWT-based authentication

Styling: Tailwind CSS with custom animations

This likely reflects an earlier implementation phase or an alternate deployment architecture before/alongside the move toward Supabase.

10.3 Technical Characteristics Common Across Descriptions

Role-based access

Protected routes

API-driven modular architecture

Dynamic frontend

Real-time-ish admin data views

Strong operational tooling

Expandable and scalable design intent

11. Data Layer and Storage Models

Because the portal details include more than one system phase, two data models are referenced.

11.1 Supabase / PostgreSQL Model

In the more current architecture:

structured relational backend

scalable persistence

API-backed admin/reviewer/team workflows

11.2 Google Sheets Database Model (Earlier WebStart Phase)

The earlier WebStart version used Google Sheets as the primary database.

Mentioned Sheets (15 total)

Core Data Sheets

Users

Proposals

Voting Results

Votes

Voting Settings

Management Sheets

Reviewers

Awarded Teams

Team Reviewer Assignments

ChatSessions

ChatMessages

Content Sheets

Announcements

Resources

Processes

Guides

This model supported:

authentication data

content management

voting data

team assignments

chat records

12. API Architecture (Referenced)
Authentication APIs

/api/auth/login

/api/auth/logout

/api/auth/verify

Core Feature APIs

/api/submit-proposal

/api/voting/*

/api/chat/*

/api/admin/*

Content Management APIs

announcements

resources

processes

user and team administration

support ticket system

These reflect the modular backend route structure used in the portal architecture.

13. Frontend and UI Architecture
Component Categories

Layout components: header, sidebar, footer

Feature components: proposal forms, awarded team connectivity, chat

Admin components: specialized managers for each management area

UI enhancement components: Three.js effects, responsive views

Navigation

A dynamic sidebar is used with role-based menu items, including:

Dashboard

Announcements

Documents

Resources

Vote for Proposals

Process Documentation

Admin Management (admin-only)

UI Characteristics

Responsive design

Dynamic content loading

Filtering/search on data-heavy admin pages

Card-based UI for awarded teams info

Performance/accessibility toggle for motion-heavy visuals

14. Recent and Confirmed Functional Enhancements
Mentioned Recent Updates

Global Analysis

Admins can view system-wide statistics

Awarded Teams UI

modern card layout

round filtering

Analysis Page

dedicated performance tracking page

Role System Update Benefits

clearer role separation

improved security

better UX

easier long-term scalability

15. Strengths Identified in Architecture Review
Structural Strengths

Well-organized component architecture

Strong role-based access control

Comprehensive admin panel

Clear modularity

Scalable API structure

Strong operational focus

UX / Feature Strengths

Anonymized collaboration system

Internal governance support

Built-in tests and analytics

Interactive UI with modern visuals

Flexible document and resource management

PDF report generation for milestone workflows

Cost / Practical Strengths (Earlier Architecture)

Innovative use of Google Sheets as a lightweight database in earlier phases

Cost-effective bootstrapping for operational systems

16. Known Enhancement Directions / Recommendations Already Identified

These were explicitly noted as improvement areas:

performance optimization

caching strategies

more robust error handling

better logging

unit and integration testing

API documentation

user guides

monitoring and analytics

possible real-time updates via WebSockets

continued documentation maintenance

17. Upcoming / Planned Features

The portal roadmap includes the following major expansions.

17.1 Reputation System Integration

A reputation and XP system is planned.

Purpose

To reward review-circle-related activity performed inside the portal.

Activities Mentioned for XP Allocation

milestone report submission

RD proposal submission

voting

MQA test participation

other review-circle activities

XP Logic

XP values will vary based on task complexity.

17.2 MQA Team Structure

A dedicated Milestone Quality Assurance (MQA) structure is planned.

Planned Workflow

milestone reports submitted by reviewers will be assigned to an MQA team of 2 users

those MQA users will:

review the reviewers’ reports

give ratings

provide comments for improvement

Purpose

improve review quality

introduce second-layer quality checks

support reviewer growth and accountability

17.3 Concatenated Leaderboard

A broader leaderboard system is planned to unify activity rankings across:

portal activity

MQA performance

reputation / XP system

This would create a consolidated activity and contribution ranking.

18. Consolidated Functional Summary

In its full intended form, the Reviewers Portal is a multi-role operational ecosystem that combines:

secure authentication

role-specific dashboards

admin management

anonymized team–reviewer communication

milestone review submission and PDF generation

partner verdict routing

internal governance voting

Idea Box proposal flows

process and resource documentation

reviewer testing

support ticketing

analytics and leaderboards

planned reputation and MQA systems

It is both an operations platform and a governance / quality-control platform for the Deep Funding Review Circle.

19. Consolidated One-Line Definition

The Reviewers Portal is a role-based, secure, and extensible internal platform for the Deep Funding Review Circle that manages milestone reviews, anonymized team–reviewer collaboration, proposal governance, partner verdict workflows, documentation, testing, support, analytics, and future reputation/quality systems in one centralized environment.