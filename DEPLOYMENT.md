# Deployment Guide

This guide will help you deploy your webstart application to make it accessible to others.

## Prerequisites

1. **GitHub Account**: You'll need a GitHub account to host your code
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (free)
3. **Google Sheets Setup**: Ensure your Google Sheets integration is working locally

## Step 1: Push to GitHub

1. **Create a new repository on GitHub:**
   - Go to [github.com](https://github.com)
   - Click "New repository"
   - Name it `webstart` (or any name you prefer)
   - Make it **Public** (required for free Vercel deployment)
   - Don't initialize with README (since you already have files)

2. **Connect your local repository to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/webstart.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 2: Deploy with Vercel

1. **Sign up/Login to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account

2. **Import your project:**
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect it's a Next.js project

3. **Configure Environment Variables:**
   Before deploying, add these environment variables in Vercel:
   - `GOOGLE_SHEETS_PRIVATE_KEY`
   - `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `GOOGLE_SHEET_ID`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel domain)

4. **Deploy:**
   - Click "Deploy"
   - Wait for the build to complete (usually 1-2 minutes)
   - Your app will be live at `https://your-project-name.vercel.app`

## Step 3: Configure Environment Variables

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add each variable from your `.env.local` file
   - **Important**: For `GOOGLE_SHEETS_PRIVATE_KEY`, make sure to include the full key with `\n` characters

2. **Update `NEXT_PUBLIC_APP_URL`:**
   - Set this to your new Vercel URL (e.g., `https://webstart-abc123.vercel.app`)

## Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Test the login functionality
3. Verify that guides and processes load correctly
4. Check that Google Sheets integration works

## Alternative Deployment Options

### Netlify
- Similar to Vercel, supports Next.js
- Free tier available
- Connect GitHub repository and deploy

### Railway
- Good for full-stack applications
- Supports databases if needed later
- Free tier with usage limits

### AWS Amplify
- More complex but powerful
- Good for enterprise applications
- Integrates well with other AWS services

## Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Check that all dependencies are in `package.json`
   - Ensure TypeScript errors are resolved
   - Verify environment variables are set correctly

2. **Google Sheets Not Working:**
   - Double-check environment variables
   - Ensure the service account has access to your sheet
   - Verify the sheet ID is correct

3. **404 Errors:**
   - Make sure all pages are properly exported
   - Check file naming conventions

### Getting Help:
- Vercel has excellent documentation and support
- Check the Vercel dashboard for build logs
- GitHub Issues for community support

## Security Notes

- Never commit `.env.local` or `.env` files to Git
- Use environment variables for all sensitive data
- Regularly rotate API keys and credentials
- Consider making your repository private for production apps

## Next Steps

Once deployed, you can:
- Share the URL with your team
- Set up custom domains
- Configure analytics and monitoring
- Set up automated deployments for updates