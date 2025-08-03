// Script to add Important Updates tab and test data for guides and processes
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function addImportantUpdatesTab() {
  try {
    // Check if environment variables are set
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      console.error('Error: Missing required environment variables.');
      console.log('Please make sure you have set up the following in your .env.local file:');
      console.log('- GOOGLE_SERVICE_ACCOUNT_EMAIL');
      console.log('- GOOGLE_PRIVATE_KEY');
      console.log('- GOOGLE_SHEET_ID');
      return;
    }

    // Initialize authentication with JWT
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Load the existing document
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    console.log(`Working with Google Sheet: ${doc.title}`);
    
    // Check if Important Updates sheet already exists
    let importantUpdatesSheet = doc.sheetsByTitle['Important Updates'];
    
    if (!importantUpdatesSheet) {
      // Create Important Updates sheet
      console.log('Creating Important Updates sheet...');
      importantUpdatesSheet = await doc.addSheet({ title: 'Important Updates' });
      
      // Set the header row for Important Updates sheet
      await importantUpdatesSheet.setHeaderRow([
        'id',
        'title',
        'content',
        'category',
        'duration',
        'expiresAt',
        'createdAt',
        'updatedAt'
      ]);
      
      // Add sample important updates
      await importantUpdatesSheet.addRows([
        {
          'id': '1',
          'title': 'System Maintenance Scheduled',
          'content': 'Our systems will undergo scheduled maintenance on Sunday from 2:00 AM to 6:00 AM EST. During this time, some services may be temporarily unavailable.',
          'category': 'important',
          'duration': '7',
          'expiresAt': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          'createdAt': new Date().toISOString(),
          'updatedAt': new Date().toISOString()
        },
        {
          'id': '2',
          'title': 'New Security Policy Implementation',
          'content': 'Effective immediately, all users must enable two-factor authentication for enhanced security. Please update your account settings within the next 30 days.',
          'category': 'important',
          'duration': '30',
          'expiresAt': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          'createdAt': new Date().toISOString(),
          'updatedAt': new Date().toISOString()
        }
      ]);
      
      console.log('✓ Important Updates sheet created with sample data');
    } else {
      console.log('✓ Important Updates sheet already exists');
    }
    
    // Add test data to Guides sheet
    const guidesSheet = doc.sheetsByTitle['Guides'];
    if (guidesSheet) {
      console.log('Adding test data to Guides sheet...');
      
      await guidesSheet.addRows([
        {
          'id': '1',
          'title': 'Getting Started Guide',
          'description': 'A comprehensive guide to help new users get started with our platform',
          'content': 'Welcome to our platform! This guide will walk you through the essential steps to get started. First, complete your profile setup by navigating to the Profile section. Next, familiarize yourself with the dashboard layout and available features. Finally, explore the resources section for additional learning materials.',
          'order': '1',
          'isPublished': 'true',
          'attachments': 'https://example.com/getting-started.pdf',
          'createdAt': new Date().toISOString(),
          'updatedAt': new Date().toISOString()
        },
        {
          'id': '2',
          'title': 'Advanced Features Tutorial',
          'description': 'Learn how to use advanced features and maximize your productivity',
          'content': 'This tutorial covers advanced features including custom workflows, automation settings, and integration capabilities. Learn how to set up automated processes, configure custom notifications, and integrate with third-party tools for enhanced productivity.',
          'order': '2',
          'isPublished': 'true',
          'attachments': 'https://example.com/advanced-tutorial.pdf,https://example.com/workflow-examples.zip',
          'createdAt': new Date().toISOString(),
          'updatedAt': new Date().toISOString()
        },
        {
          'id': '3',
          'title': 'Troubleshooting Common Issues',
          'description': 'Solutions to frequently encountered problems and error messages',
          'content': 'This guide provides solutions to common issues users may encounter. Topics include login problems, data synchronization issues, performance optimization, and error message explanations. Follow the step-by-step instructions to resolve most common problems quickly.',
          'order': '3',
          'isPublished': 'true',
          'attachments': '',
          'createdAt': new Date().toISOString(),
          'updatedAt': new Date().toISOString()
        }
      ]);
      
      console.log('✓ Test data added to Guides sheet');
    }
    
    // Check if Processes sheet exists, if not create it
    let processesSheet = doc.sheetsByTitle['Processes'];
    
    if (!processesSheet) {
      console.log('Creating Processes sheet...');
      processesSheet = await doc.addSheet({ title: 'Processes' });
      
      // Set the header row for Processes sheet
      await processesSheet.setHeaderRow([
        'id',
        'title',
        'description',
        'content',
        'category',
        'order',
        'isPublished',
        'attachments',
        'createdAt',
        'updatedAt'
      ]);
      
      // Add sample process documentation
      await processesSheet.addRows([
        {
          'id': '1',
          'title': 'Project Approval Process',
          'description': 'Step-by-step process for getting project proposals approved',
          'content': 'The project approval process consists of several stages: 1) Initial proposal submission through the portal, 2) Technical review by the engineering team, 3) Budget assessment by finance, 4) Final approval by management. Each stage has specific requirements and timelines that must be followed.',
          'category': 'approval',
          'order': '1',
          'isPublished': 'true',
          'attachments': 'https://example.com/approval-flowchart.pdf',
          'createdAt': new Date().toISOString(),
          'updatedAt': new Date().toISOString()
        },
        {
          'id': '2',
          'title': 'Quality Assurance Workflow',
          'description': 'Standard QA procedures and testing protocols',
          'content': 'Our QA workflow ensures high-quality deliverables through systematic testing. The process includes: unit testing, integration testing, user acceptance testing, and final quality review. Each phase has specific criteria and documentation requirements.',
          'category': 'quality',
          'order': '2',
          'isPublished': 'true',
          'attachments': 'https://example.com/qa-checklist.pdf,https://example.com/testing-templates.zip',
          'createdAt': new Date().toISOString(),
          'updatedAt': new Date().toISOString()
        },
        {
          'id': '3',
          'title': 'Incident Response Protocol',
          'description': 'Emergency procedures for handling system incidents',
          'content': 'When system incidents occur, follow this protocol: 1) Immediate assessment and containment, 2) Stakeholder notification, 3) Root cause analysis, 4) Resolution implementation, 5) Post-incident review and documentation. Time-sensitive actions must be completed within specified SLA timeframes.',
          'category': 'emergency',
          'order': '3',
          'isPublished': 'true',
          'attachments': 'https://example.com/incident-response.pdf',
          'createdAt': new Date().toISOString(),
          'updatedAt': new Date().toISOString()
        }
      ]);
      
      console.log('✓ Processes sheet created with sample data');
    } else {
      console.log('✓ Processes sheet already exists');
    }
    
    console.log('\n✅ All sheets updated successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your API routes to handle Important Updates and Processes');
    console.log('2. Modify the frontend to display the new data structures');
    
  } catch (error) {
    console.error('Error updating Google Sheets:', error);
  }
}

addImportantUpdatesTab();