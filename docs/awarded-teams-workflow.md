# Awarded Teams Connect - Complete Workflow Guide

## Overview
The Awarded Teams Connect system allows administrators to assign reviewers to awarded teams and facilitates secure communication between them. This document outlines the complete workflow and technical implementation.

## 🗂️ Data Structure

### Google Sheets Structure
The system uses the following sheets in your Google Spreadsheet:

#### 1. **Reviewers Sheet**
```
Columns: ID | NAME | MATTERMOST ID | EMAIL | Github ID's | CV link | Expertise
Purpose: Store reviewer information with unique IDs for database operations
Example: REV-1756673287-1 | John Doe | john.doe | john@example.com | johndoe | cv.pdf | React,Node.js
```

#### 2. **Awarded Teams Sheet**
```
Columns: ID | Team Name | Proposal ID | Proposal Title | Team Leader Email | Team Leader Name | Award Date | Status | Created At | Updated At
Purpose: Store information about teams that have been awarded funding
Example: TEAM-1756673287 | WebStart Team | PROP-001 | Web Platform | leader@team.com | Jane Smith | 2024-01-15 | active
```

#### 3. **Team Reviewer Assignments Sheet**
```
Columns: ID | Team ID | Reviewer ID | Assigned By | Assigned At | Status | Approved By | Approved At | Revoked By | Revoked At | Notes | Created At | Updated At
Purpose: Track which reviewers are assigned to which teams
Example: ASSIGN-1756673287 | TEAM-001 | REV-001 | admin@system.com | 2024-01-15T10:00:00Z | approved
```

#### 4. **ChatSessions Sheet**
```
Columns: ID | AssignmentID | TeamID | ReviewerID | Status | CreatedAt | LastActivity
Purpose: Track chat sessions between teams and reviewers
```

#### 5. **ChatMessages Sheet**
```
Columns: ID | SessionID | SenderID | SenderRole | Content | MessageType | Timestamp | FileData
Purpose: Store individual chat messages and file attachments
```

## 🔄 Complete Workflow Steps

### Phase 1: Setup and Data Management

#### Step 1: Add Reviewers
1. **Admin Access**: Navigate to `/admin-management` → "Awarded Teams Connect"
2. **Add Reviewer**: Click "Add Reviewer" button
3. **Fill Form**:
   - Name (required)
   - Email (required)
   - Mattermost ID (optional)
   - GitHub IDs (optional)
   - CV Link (optional)
   - Expertise (comma-separated tags)
4. **System Action**: 
   - Generates unique ID (`REV-{timestamp}`)
   - Stores in Reviewers sheet
   - Assigns anonymous name for privacy

#### Step 2: Add Awarded Teams
1. **Add Team**: Click "Add Team" button
2. **Fill Form**:
   - Team Name
   - Proposal ID
   - Proposal Title
   - Team Leader Email
   - Team Leader Name
   - Award Date
3. **System Action**:
   - Generates unique ID (`TEAM-{timestamp}`)
   - Stores in Awarded Teams sheet
   - Sets status to 'active'

### Phase 2: Assignment Process

#### Step 3: Assign Reviewers to Teams
1. **Assignment Interface**: Use the "Assignments" tab
2. **Select Team**: Choose from dropdown of awarded teams
3. **Select Reviewer**: Choose from dropdown of available reviewers
4. **Add Notes**: Optional assignment notes
5. **System Action**:
   - Creates assignment record with status 'pending'
   - Generates unique assignment ID (`ASSIGN-{timestamp}`)
   - Stores in Team Reviewer Assignments sheet

#### Step 4: Admin Approval
1. **Review Assignment**: Admin sees pending assignments
2. **Approve/Reject**: Admin can approve or revoke assignments
3. **System Action**:
   - Updates assignment status to 'approved' or 'revoked'
   - Records approval timestamp and admin ID
   - Triggers notification system (if implemented)

### Phase 3: Communication

#### Step 5: Team Access
1. **Team Login**: Team leader logs into the system
2. **Dashboard Access**: "Awarded Teams Connect" button appears (conditional)
3. **View Assignments**: See assigned reviewers (anonymized)
4. **Start Chat**: Click to initiate communication

#### Step 6: Chat System
1. **Session Creation**: 
   - System creates chat session record
   - Links team, reviewer, and assignment
2. **Real-time Messaging**:
   - Text messages
   - File sharing capabilities
   - Timestamp tracking
3. **Anonymization**: Reviewers appear as "Review Circle Reviewer A/B/C"

## 🔧 Technical Implementation

### API Endpoints

#### GET `/api/admin/awarded-teams`
- Fetches all teams, reviewers, and assignments
- Returns structured data for admin interface

#### POST `/api/admin/awarded-teams`
Supports multiple operations via `type` parameter:

**Create Team** (`type: 'create_team'`):
```json
{
  "type": "create_team",
  "data": {
    "teamName": "WebStart Team",
    "proposalId": "PROP-001",
    "proposalTitle": "Web Platform",
    "teamLeaderEmail": "leader@team.com",
    "teamLeaderName": "Jane Smith",
    "awardDate": "2024-01-15"
  }
}
```

**Create Reviewer** (`type: 'create_reviewer'`):
```json
{
  "type": "create_reviewer",
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "mattermostId": "john.doe",
    "githubIds": "johndoe",
    "cvLink": "https://example.com/cv.pdf",
    "expertise": ["React", "Node.js"]
  }
}
```

**Assign Reviewer** (`type: 'assign_reviewer'`):
```json
{
  "type": "assign_reviewer",
  "data": {
    "teamId": "TEAM-1756673287",
    "reviewerId": "REV-1756673287-1",
    "assignedBy": "admin@system.com",
    "notes": "Expert in React development"
  }
}
```

### Frontend Components

#### Admin Interface (`AwardedTeamsManager.tsx`)
- **Team Management**: Add/view awarded teams
- **Reviewer Management**: Add/view reviewers with all fields
- **Assignment Management**: Create and manage team-reviewer assignments
- **Status Tracking**: Monitor assignment statuses

#### User Interface (`AwardedTeamsConnect.tsx`)
- **Conditional Access**: Only shows for awarded team leaders
- **Anonymous Display**: Reviewers shown as "Review Circle Reviewer"
- **Chat Integration**: Real-time messaging interface

## 🔐 Security & Privacy Features

### Reviewer Anonymization
- Reviewers are displayed as "Review Circle Reviewer A/B/C"
- Real names/emails hidden from teams
- Only admins see full reviewer details

### Access Control
- Admin-only access to assignment management
- Team leaders only see their assigned reviewers
- Reviewers only see their assigned teams

### Data Integrity
- Unique ID generation for all entities
- Proper foreign key relationships
- Status tracking for all operations

## 🚀 Usage Examples

### Example 1: Complete Assignment Flow
1. Admin adds reviewer "Alice Johnson" with React expertise
2. Admin adds awarded team "WebStart Project"
3. Admin assigns Alice to WebStart team
4. Admin approves the assignment
5. WebStart team leader sees "Review Circle Reviewer A" in their dashboard
6. Team leader initiates chat with the reviewer
7. Real-time communication begins

### Example 2: Multiple Reviewers
1. Team gets assigned 3 reviewers
2. They appear as "Review Circle Reviewer A", "B", "C"
3. Separate chat sessions for each reviewer
4. Admin can track all communications

## 📊 Monitoring & Analytics

### Admin Dashboard Metrics
- Total awarded teams
- Total active reviewers
- Pending assignments
- Active chat sessions
- Assignment success rates

### Data Export
- All data stored in Google Sheets
- Easy export for reporting
- Audit trail for all operations

## 🔧 Maintenance

### Regular Tasks
1. **Review Assignments**: Monitor pending assignments
2. **Update Reviewer Status**: Mark reviewers as available/unavailable
3. **Clean Up**: Archive completed assignments
4. **Backup**: Regular Google Sheets backups

### Troubleshooting
- Check Google Sheets API connectivity
- Verify environment variables
- Monitor chat session status
- Review assignment statuses

This system provides a complete solution for connecting awarded teams with expert reviewers while maintaining privacy and enabling effective communication.