import { NextRequest, NextResponse } from 'next/server';
import { invalidateVotingSettingsCache } from '@/lib/voting-settings';
import { supabaseAdmin } from '@/lib/supabase/server';

interface VotingSetting {
  settingKey: string;
  settingValue: string;
  description: string;
  updatedAt: string;
}

// GET - Fetch voting settings
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('voting_setting')
      .select('*');

    if (error) {
      console.error('Supabase fetch voting settings error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch voting settings' },
        { status: 500 }
      );
    }

    let rows = data || [];

    // Seed defaults if table is empty
    if (rows.length === 0) {
      const now = new Date().toISOString();
      const defaults: VotingSetting[] = [
        {
          settingKey: 'voting_duration_days',
          settingValue: '30',
          description: 'Number of days a proposal remains open for voting',
          updatedAt: now
        },
        {
          settingKey: 'allow_vote_changes',
          settingValue: 'TRUE',
          description: 'Allow users to change their votes on proposals',
          updatedAt: now
        },
        {
          settingKey: 'min_votes_required',
          settingValue: '5',
          description: 'Minimum number of votes required for a proposal to be considered',
          updatedAt: now
        }
      ];
      const { error: insertError } = await supabaseAdmin
        .from('voting_setting')
        .insert(defaults);
      if (insertError) {
        console.error('Supabase seed voting settings error:', insertError);
      } else {
        rows = defaults as any[];
      }
    }

    const settings: VotingSetting[] = rows.map((row: any) => ({
      settingKey: row.settingKey ?? row.setting_key ?? '',
      settingValue: row.settingValue ?? row.setting_value ?? '',
      description: row.description ?? '',
      updatedAt: row.updatedAt ?? row.updated_at ?? new Date().toISOString()
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
      const days = parseInt(String(settingValue));
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json(
          { success: false, message: 'Voting duration must be between 1 and 365 days' },
          { status: 400 }
        );
      }
    }

    if (settingKey === 'min_votes_required') {
      const votes = parseInt(String(settingValue));
      if (isNaN(votes) || votes < 1 || votes > 100) {
        return NextResponse.json(
          { success: false, message: 'Minimum votes must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    if (settingKey === 'allow_vote_changes') {
      const val = String(settingValue).toUpperCase();
      if (!['TRUE', 'FALSE'].includes(val)) {
        return NextResponse.json(
          { success: false, message: 'Allow vote changes must be TRUE or FALSE' },
          { status: 400 }
        );
      }
    }

    const nowISO = new Date().toISOString();

    // Fetch current setting
    const { data: currentRows, error: fetchError } = await supabaseAdmin
      .from('voting_setting')
      .select('*')
      .eq('settingKey', settingKey)
      .limit(1);
    if (fetchError) {
      console.error('Supabase fetch setting error:', fetchError);
    }
    const current = currentRows?.[0];
    const oldValue = current?.settingValue ?? '';

    // If changing voting_duration_days, append a history record
    if (settingKey === 'voting_duration_days' && String(oldValue) !== String(settingValue)) {
      const { error: histError } = await supabaseAdmin
        .from('voting_setting_history')
        .insert([{
          settingKey: 'voting_duration_days',
          oldValue: oldValue ? Number(oldValue) : null,
          newValue: Number(settingValue),
          effectiveAt: nowISO,
          updatedAt: nowISO
        }]);
      if (histError) {
        console.error('Supabase insert history error:', histError);
      }
    }

    const defaultDescriptions: Record<string, string> = {
      'voting_duration_days': 'Number of days a proposal remains open for voting',
      'allow_vote_changes': 'Allow users to change their votes on proposals',
      'min_votes_required': 'Minimum number of votes required for a proposal to be considered'
    };

    // Upsert setting value
    if (current) {
      const { error: updateError } = await supabaseAdmin
        .from('voting_setting')
        .update({ settingValue: String(settingValue), updatedAt: nowISO })
        .eq('settingKey', settingKey);
      if (updateError) {
        console.error('Supabase update setting error:', updateError);
        return NextResponse.json(
          { success: false, message: 'Failed to update voting setting' },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('voting_setting')
        .insert([{ 
          settingKey, 
          settingValue: String(settingValue), 
          description: defaultDescriptions[settingKey] || '', 
          updatedAt: nowISO 
        }]);
      if (insertError) {
        console.error('Supabase insert setting error:', insertError);
        return NextResponse.json(
          { success: false, message: 'Failed to update voting setting' },
          { status: 500 }
        );
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
    return NextResponse.json(
      { success: false, message: 'Failed to update voting setting' },
      { status: 500 }
    );
  }
}