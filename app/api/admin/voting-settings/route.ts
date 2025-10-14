import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { invalidateVotingSettingsCache } from '@/lib/voting-settings';

// Initialize Google Sheets client
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);

interface VotingSetting {
  settingKey: string;
  settingValue: string;
  description: string;
  updatedAt: string;
}

// GET - Fetch voting settings
export async function GET() {
  try {
    await doc.loadInfo();
    
    // Get or create Voting Settings sheet
    let votingSettingsSheet = doc.sheetsByTitle['Voting Settings'];
    if (!votingSettingsSheet) {
      votingSettingsSheet = await doc.addSheet({
        title: 'Voting Settings',
        headerValues: ['settingKey', 'settingValue', 'description', 'updatedAt']
      });
      
      // Add default settings
      const defaultSettings = [
        {
          'settingKey': 'voting_duration_days',
          'settingValue': '30',
          'description': 'Number of days a proposal remains open for voting',
          'updatedAt': new Date().toISOString()
        },
        {
          'settingKey': 'allow_vote_changes',
          'settingValue': 'TRUE',
          'description': 'Allow users to change their votes on proposals',
          'updatedAt': new Date().toISOString()
        },
        {
          'settingKey': 'min_votes_required',
          'settingValue': '5',
          'description': 'Minimum number of votes required for a proposal to be considered',
          'updatedAt': new Date().toISOString()
        }
      ];
      
      await votingSettingsSheet.addRows(defaultSettings);
    }

    const rows = await votingSettingsSheet.getRows();
    const settings: VotingSetting[] = rows.map(row => ({
      settingKey: row.get('settingKey') || '',
      settingValue: row.get('settingValue') || '',
      description: row.get('description') || '',
      updatedAt: row.get('updatedAt') || new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Error fetching voting settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch voting settings' },
      { status: 500 }
    );
  }
}

// PUT - Update voting setting
export async function PUT(request: NextRequest) {
  try {
    const { settingKey, settingValue } = await request.json();

    if (!settingKey || settingValue === undefined) {
      return NextResponse.json(
        { success: false, message: 'Setting key and value are required' },
        { status: 400 }
      );
    }

    // Validate setting values
    if (settingKey === 'voting_duration_days') {
      const days = parseInt(settingValue);
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json(
          { success: false, message: 'Voting duration must be between 1 and 365 days' },
          { status: 400 }
        );
      }
    }

    if (settingKey === 'min_votes_required') {
      const votes = parseInt(settingValue);
      if (isNaN(votes) || votes < 1 || votes > 100) {
        return NextResponse.json(
          { success: false, message: 'Minimum votes must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    if (settingKey === 'allow_vote_changes') {
      if (!['TRUE', 'FALSE'].includes(settingValue.toUpperCase())) {
        return NextResponse.json(
          { success: false, message: 'Allow vote changes must be TRUE or FALSE' },
          { status: 400 }
        );
      }
    }

    await doc.loadInfo();
    const votingSettingsSheet = doc.sheetsByTitle['Voting Settings'];
    
    if (!votingSettingsSheet) {
      return NextResponse.json(
        { success: false, message: 'Voting Settings sheet not found' },
        { status: 404 }
      );
    }

    const rows = await votingSettingsSheet.getRows();
    const settingRow = rows.find(row => row.get('settingKey') === settingKey);

    if (!settingRow) {
      return NextResponse.json(
        { success: false, message: 'Setting not found' },
        { status: 404 }
      );
    }

    // Capture old value for history (only for voting_duration_days changes)
    const oldValue = String(settingRow.get('settingValue') || '');

    // If changing voting_duration_days, append a history record first
    if (settingKey === 'voting_duration_days' && oldValue !== String(settingValue)) {
      let historySheet = doc.sheetsByTitle['Voting Settings History'];
      if (!historySheet) {
        historySheet = await doc.addSheet({
          title: 'Voting Settings History',
          headerValues: ['settingKey', 'oldValue', 'newValue', 'effectiveAt', 'updatedAt']
        });
      }

      const historyRowData = {
        'settingKey': 'voting_duration_days',
        'oldValue': oldValue,
        'newValue': String(settingValue),
        'effectiveAt': new Date().toISOString(),
        'updatedAt': new Date().toISOString()
      };

      // Retry addRow with exponential backoff to handle Google Sheets write quota (429)
      {
        const maxRetries = 5;
        let attempt = 0;
        while (true) {
          try {
            await historySheet.addRow(historyRowData);
            break;
          } catch (err: any) {
            const status = err?.response?.status || err?.status || err?.code;
            const msg = String(err?.message || '');
            const isRateLimited = status === 429 || msg.includes('Quota exceeded') || String(err).includes('429');
            attempt++;
            if (!isRateLimited || attempt >= maxRetries) {
              throw err;
            }
            const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000) + Math.floor(Math.random() * 250);
            await new Promise(res => setTimeout(res, delayMs));
          }
        }
      }
    }

    // Update the setting
    settingRow.set('settingValue', settingValue);
    settingRow.set('updatedAt', new Date().toISOString());
    // Retry with exponential backoff to handle Google Sheets write quota (429)
    {
      const maxRetries = 5;
      let attempt = 0;
      while (true) {
        try {
          await settingRow.save();
          break;
        } catch (err: any) {
          const status = err?.response?.status || err?.status || err?.code;
          const msg = String(err?.message || '');
          const isRateLimited = status === 429 || msg.includes('Quota exceeded') || String(err).includes('429');
          attempt++;
          if (!isRateLimited || attempt >= maxRetries) {
            throw err;
          }
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000) + Math.floor(Math.random() * 250);
          await new Promise(res => setTimeout(res, delayMs));
        }
      }
    }

    // Invalidate cache so new submissions use updated settings immediately
    invalidateVotingSettingsCache();

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully'
    });

  } catch (error) {
    console.error('Error updating voting setting:', error);
    const status = (error as any)?.response?.status || (error as any)?.status || (error as any)?.code;
    const msg = String((error as any)?.message || '');
    const isRateLimited = status === 429 || msg.includes('Quota exceeded') || String(error).includes('429');
    return NextResponse.json(
      { success: false, message: isRateLimited ? 'Rate limit: Google Sheets write quota exceeded. Please retry shortly.' : 'Failed to update voting setting' },
      { status: isRateLimited ? 429 : 500 }
    );
  }
}