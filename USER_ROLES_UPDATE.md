# User Roles System Update

## Overview
This document outlines the changes made to the user roles system in the Review Circle application to provide distinct login experiences for different user types.

## Changes Made

### 1. Role Structure Update
**Before:**
- `admin`: Full system access
- `reviewer`: Can review and assign teams
- `coordinator`: Mixed role with unclear permissions

**After:**
- `admin`: Full system access and management capabilities
- `reviewer`: Can review teams and view assignment information
- `team_leader`: Access to team dashboard only for awarded teams

### 2. Files Modified

#### Core Application Files:
- `app/types/auth.ts` - Updated User interface to use 'team_leader' instead of 'coordinator'
- `app/api/auth/route.ts` - Updated authentication to handle new role
- `app/page.tsx` - Updated dashboard logic to use 'team_leader' role
- `app/announcements/page.tsx` - Updated role checking for admin controls

#### Documentation:
- `WEBAPP_DOCUMENTATION.md` - Updated role descriptions
- `USER_ROLES_UPDATE.md` - This documentation file

#### Scripts:
- `scripts/update-user-roles.js` - New script to migrate existing users
- `add-team-test-user.js` - Updated to use 'team_leader' role
- `add-coordinator-user.js` → `add-team-leader-user.js` - Renamed and updated

### 3. Google Sheets Updates
- Existing users with 'coordinator' role were automatically updated to 'team_leader'
- Sample team leader users were added if none existed

## User Experience Changes

### Admin Users
- See full dashboard with sidebar and all sections
- Can manage announcements and system settings
- Have access to all administrative features

### Reviewer Users
- See dedicated reviewer dashboard
- View assignment information with message: "This assignment is made to you for this awarded team"
- Can access chat functionality with assigned teams
- No access to full system dashboard

### Team Leader Users
- Only see team dashboard if they are leaders of awarded teams
- Non-awarded team leaders see the regular dashboard
- Access to team-specific features and reviewer communication
- Simplified interface focused on team collaboration

## Migration Process

1. **Automatic Migration**: Run `node scripts/update-user-roles.js` to update existing users
2. **Manual Verification**: Check Google Sheets to ensure all roles are correctly updated
3. **Testing**: Verify login functionality for each role type

## Testing the Changes

### Sample Users for Testing:
- **Admin**: `admin1` / `admin123`
- **Reviewer**: `reviewer1` / `password123`
- **Team Leader**: `teamtest` / `team123` (if awarded team exists)

### Verification Steps:
1. Login with each role type
2. Verify appropriate dashboard is displayed
3. Check that team leaders only see team dashboard when they lead awarded teams
4. Confirm reviewers see assignment information
5. Ensure admins have full system access

## Benefits of New System

1. **Clear Role Separation**: Each role has distinct permissions and interface
2. **Improved Security**: Team leaders only access relevant features
3. **Better User Experience**: Role-appropriate dashboards reduce confusion
4. **Scalability**: Easy to add new roles or modify permissions

## Next Steps

1. Test the application with different user roles
2. Update any remaining documentation
3. Train users on the new role-based system
4. Monitor for any issues and gather feedback

---

*Last Updated: January 2025*
*Application Version: Review Circle v2.0*