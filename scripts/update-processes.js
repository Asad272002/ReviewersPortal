const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function updateProcesses() {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log('Working with Google Sheet:', doc.title);

    // Check if Processes sheet exists
    let processesSheet = doc.sheetsByTitle['Processes'];
    
    if (!processesSheet) {
      console.log('Creating Processes sheet...');
      processesSheet = await doc.addSheet({
        title: 'Processes',
        headerValues: [
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
        ]
      });
    } else {
      console.log('Processes sheet exists, clearing old data...');
      // Clear existing rows except header
      const rows = await processesSheet.getRows();
      for (const row of rows) {
        await row.delete();
      }
    }
    
    // Add sample process documentation with published status
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
    
    console.log('✓ Processes sheet updated with published data');
    console.log('\n✅ Processes data updated successfully!');
    
  } catch (error) {
    console.error('Error updating Processes sheet:', error);
  }
}

updateProcesses();