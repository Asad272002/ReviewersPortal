# Review Circle - Reviewer Portal

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). The application serves as a reviewer portal for the Deep Funding Review Circle, allowing reviewers to access requirement documents and submit proposals.

## Features

- Interactive dashboard for reviewers
- Requirement documents and guidelines
- Proposal submission form with Google Sheets integration
- Responsive design with smooth animations
- Authentication system with Google Sheets integration for user management

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Google Sheets Integration

This application integrates with Google Sheets for two main purposes:

### 1. Proposal Submission Storage

The proposal submission form stores data in a Google Sheet. To set up this integration:

1. Follow the instructions in the `docs/google-sheets-setup.md` file
2. Copy `.env.local.example` to `.env.local` and update with your Google API credentials
3. Install the required packages: `npm install google-spreadsheet google-auth-library`
4. Run the setup script: `node scripts/create-google-sheet.js`

### 2. User Authentication

The authentication system uses Google Sheets to store and validate user credentials:

- Admin and reviewer accounts are stored in a separate sheet
- Login credentials are verified against the Google Sheet
- User roles (admin/reviewer) are managed through the sheet

For a complete setup guide, refer to the `scripts/SETUP_GUIDE.md` file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load custom fonts.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
