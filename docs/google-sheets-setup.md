# Google Sheets Integration Setup Guide

This document provides step-by-step instructions for setting up the Google Sheets integration for both the proposal submission form and user authentication system.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Node.js and npm installed

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click on "New Project"
4. Enter a name for your project (e.g., "Review Circle Proposals")
5. Click "Create"

## Step 2: Enable the Google Sheets API

1. In your new project, go to the navigation menu and select "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click on "Google Sheets API" in the results
4. Click "Enable"

## Step 3: Create a Service Account

1. In the Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" and select "Service Account"
3. Enter a name for your service account (e.g., "proposals-service-account")
4. Click "Create and Continue"
5. For the role, select "Project" > "Editor"
6. Click "Continue" and then "Done"

## Step 4: Create and Download Service Account Key

1. In the Credentials page, find your newly created service account and click on it
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" as the key type
5. Click "Create"
6. The key file will be automatically downloaded to your computer
7. Keep this file secure and do not commit it to version control

## Step 5: Create a Google Sheet

Instead of manually creating a Google Sheet, we've provided a script that will create the sheet with the correct structure for both proposal submissions and user authentication:

```bash
node scripts/create-google-sheet.js
```

This script will:

1. Create a new Google Sheet titled "Proposal Submissions"
2. Create seven sheets within the document:
   - **Proposals sheet** with the following headers:
     - Reviewer Name
     - Proposal Title
     - Project Category
     - Team Size
     - Budget Estimate
     - Timeline (Weeks)
     - Proposal Summary
     - Technical Approach
     - Additional Notes
     - Submission Date
     - Proposal ID
   - **Users sheet** with the following headers:
     - ID
     - Username
     - Password
     - Name
     - Role
   - **AwardedTeams sheet** with the following headers:
     - ID
     - Name
     - Description
     - Status
     - CreatedAt
   - **Reviewers sheet** with the following headers:
     - ID
     - Name
     - Email
     - Specialization
     - Status
     - CreatedAt
   - **TeamReviewerAssignments sheet** with the following headers:
     - ID
     - TeamID
     - ReviewerID
     - Status
     - AssignedAt
     - ApprovedAt
     - CompletedAt
   - **ChatSessions sheet** with the following headers:
     - ID
     - AssignmentID
     - TeamID
     - ReviewerID
     - Status
     - CreatedAt
     - LastActivity
   - **ChatMessages sheet** with the following headers:
     - ID
     - SessionID
     - SenderID
     - SenderRole
     - Content
     - MessageType
     - Timestamp
     - FileData
3. Add sample user accounts for testing:
   - Admin user
   - Reviewer users
4. Output the Sheet ID for your `.env.local` file

## Step 6: Share the Google Sheet with the Service Account

1. In your Google Sheet, click the "Share" button in the top-right corner
2. In the email field, enter the service account email (found in the service account details or in the downloaded JSON file)
3. Make sure the service account has "Editor" access
4. Uncheck the "Notify people" option
5. Click "Share"

## Step 7: Set Up Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist already)
2. Add the following environment variables:

```
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email_here
GOOGLE_PRIVATE_KEY="your_private_key_here"
```

- The `GOOGLE_SHEET_ID` is found in the URL of your Google Sheet: `https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SHEET_ID]/edit`
- The `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` are found in the JSON file you downloaded

**Note:** Make sure to include the quotes around the private key and escape any newline characters (\n).

## Step 8: Install Required Packages

Run the following command in your project directory:

```bash
npm install google-spreadsheet google-auth-library
```

The `google-spreadsheet` package is used for interacting with Google Sheets, and `google-auth-library` is required for the JWT authentication method used in version 4.1.0 of the Google Spreadsheet library.

## Step 9: Update the API Routes

Two API routes need to be configured for the Google Sheets integration:

### 9.1 Proposal Submission API Route

The file `app/api/submit-proposal/route.ts` handles saving proposal data to the Google Sheet. It should look like this:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'reviewerName',
      'proposalTitle',
      'projectCategory',
      'teamSize',
      'budgetEstimate',
      'timelineWeeks',
      'proposalSummary',
      'technicalApproach'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Google Sheets integration
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    
    // Add row to Google Sheet
    await sheet.addRow({
      'Reviewer Name': data.reviewerName,
      'Proposal Title': data.proposalTitle,
      'Project Category': data.projectCategory,
      'Team Size': data.teamSize,
      'Budget Estimate': data.budgetEstimate,
      'Timeline (Weeks)': data.timelineWeeks,
      'Proposal Summary': data.proposalSummary,
      'Technical Approach': data.technicalApproach,
      'Additional Notes': data.additionalNotes || '',
      'Submission Date': new Date().toISOString(),
      'Proposal ID': `PROP-${Date.now()}`
    });
    
    return NextResponse.json({
      success: true,
      message: 'Proposal submitted successfully',
      data: {
        id: `PROP-${Date.now()}`,
        submittedAt: new Date().toISOString(),
      }
    });
    
  } catch (error) {
    console.error('Error submitting proposal:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 9.2 Authentication API Route

The file `app/api/auth/route.ts` handles user authentication using the Users sheet in Google Sheets. This file should be created with the following content:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Initialize auth with JWT
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Initialize the sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Get the Users sheet (should be the second sheet)
    const usersSheet = doc.sheetsByTitle['Users'];
    if (!usersSheet) {
      return NextResponse.json(
        { success: false, message: 'Users sheet not found' },
        { status: 500 }
      );
    }
    
    // Load all rows
    const rows = await usersSheet.getRows();
    
    // Find user with matching username and password
    const user = rows.find(row => 
      row.get('Username') === username && 
      row.get('Password') === password
    );
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }
    
    // Return user data (excluding password)
    return NextResponse.json({
      success: true,
      user: {
        id: user.get('ID'),
        username: user.get('Username'),
        name: user.get('Name'),
        role: user.get('Role'),
      }
    });
    
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Step 10: Test the Integration

1. Restart your development server
2. Test the authentication:
   - Navigate to the login page
   - Log in with one of the sample user credentials:
     - Admin: username `admin1`, password `admin123`
     - Reviewer: username `reviewer1`, password `password123`
3. Test the proposal submission:
   - Navigate to the Documents page
   - Click "Show Form" to display the proposal form
   - Fill out the form and submit
4. Test the Awarded Teams Connect feature:
   - Log in as an admin
   - Navigate to the Admin Management page
   - Click on "Awarded Teams" to access the management interface
   - Add teams and reviewers, then create assignments
   - Approve assignments and test the chat functionality
5. Check your Google Sheet to verify that the data was added correctly to all sheets

## Troubleshooting

- **CORS Issues**: If you encounter CORS issues, make sure your Google Cloud project has the correct API permissions.
- **Authentication Errors**: Double-check your environment variables, especially the private key format.
- **Sheet Access Issues**: Ensure the service account has editor access to the Google Sheet.
- **JWT Authentication**: If you see errors about `useServiceAccountAuth` not being a function, make sure you're using the JWT authentication method as shown in the examples above.
- **Sheet Structure**: If you get errors about missing sheets or columns, verify that the script created both the 'Proposals' and 'Users' sheets with the correct headers.

## Production Deployment

For production deployment, make sure to set the environment variables in your hosting platform (Vercel, Netlify, etc.).

## Security Considerations

- Never expose your service account credentials in client-side code
- Consider implementing rate limiting to prevent abuse
- Regularly rotate your service account keys for enhanced security