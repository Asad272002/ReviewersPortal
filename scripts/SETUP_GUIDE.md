# Google Sheets Integration Setup Guide

This guide will walk you through the process of setting up the Google Sheets integration for both the proposal submission form and user authentication using the provided scripts.

## Step 1: Set Up Google Cloud Project and Service Account

Follow the detailed instructions in the [Google Sheets Setup Guide](../docs/google-sheets-setup.md) to:

1. Create a Google Cloud project
2. Enable the Google Sheets API
3. Create a service account
4. Download the service account key file

## Step 2: Configure Environment Variables

1. Copy the `.env.local.example` file to `.env.local` in the root directory:

   ```bash
   cp .env.local.example .env.local
   ```

2. Open the `.env.local` file and add your Google service account credentials:

   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
   ```

   **Note:** Make sure to include the quotes around the private key and replace newline characters with `\n`.

## Step 3: Create a Google Sheet

Run the script to create a new Google Sheet with the appropriate structure:

```bash
node scripts/create-google-sheet.js
```

This script will:
1. Create a new Google Sheet titled "Proposal Submissions"
2. Create two sheets:
   - **Proposals**: For storing proposal submission data
   - **Users**: For storing user credentials (admin and reviewer accounts)
3. Set up the header rows with all the required fields
4. Add sample user accounts for testing
5. Output the Sheet ID

## Step 4: Update Your Environment Variables

Add the Sheet ID to your `.env.local` file:

```
GOOGLE_SHEET_ID=your_sheet_id_here
```

## Step 5: Share the Google Sheet

1. Open the Google Sheet in your browser
2. Click the "Share" button in the top-right corner
3. Add your service account email with "Editor" access
4. Uncheck the "Notify people" option
5. Click "Share"

## Step 6: Test the Connection

Run the test script to verify that your Google Sheets integration is working correctly:

```bash
node scripts/test-google-sheets-connection.js
```

If successful, you should see a confirmation message and a test row will be added to your Google Sheet.

## Step 7: Update the API Routes

The API routes have already been updated to include the Google Sheets integration code:

1. **Proposal Submission**: `app/api/submit-proposal/route.ts` - Handles saving proposal data to the Proposals sheet
2. **Authentication**: `app/api/auth/route.ts` - Handles user authentication using the Users sheet

If you need to make any changes, you can edit these files.

## Step 8: Restart Your Development Server

Restart your development server to apply the changes:

```bash
npm run dev
```

## Troubleshooting

If you encounter any issues:

1. Check that your Google Cloud project has the Google Sheets API enabled
2. Verify that your service account has the correct permissions
3. Ensure that your Google Sheet is shared with the service account email
4. Double-check your `.env.local` file for any typos or formatting issues
5. Look for error messages in the console when running the scripts

## Next Steps

Once your Google Sheets integration is set up and working correctly:

1. Test the proposal submission form to make sure data is being saved to your Google Sheet
2. Test the login functionality with the sample user credentials:
   - Admin: username `admin1`, password `admin123`
   - Reviewer: username `reviewer1`, password `password123`
   - Reviewer: username `reviewer2`, password `password123`
3. Customize the Google Sheet as needed (add formulas, conditional formatting, etc.)
4. Add or modify user accounts in the Users sheet as needed
5. Consider setting up additional sheets for different types of data if needed

Congratulations! Your application is now fully integrated with Google Sheets for both proposal submissions and user authentication.