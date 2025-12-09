'use client';

import { useState, useEffect } from 'react';

interface VotingSetting {
  settingKey: string;
  settingValue: string;
  description: string;
  updatedAt: string;
}

export default function VotingSettingsManager() {
  const [settings, setSettings] = useState<VotingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/voting-settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch settings' });
      }
    } catch (error) {
      console.error('Error fetching voting settings:', error);
      setMessage({ type: 'error', text: 'Error fetching voting settings' });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingKey: string, newValue: string) => {
    try {
      setSaving(settingKey);
      const response = await fetch('/api/admin/voting-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settingKey,
          settingValue: newValue,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSettings(prev => prev.map(setting => 
          setting.settingKey === settingKey 
            ? { ...setting, settingValue: newValue, updatedAt: new Date().toISOString() }
            : setting
        ));
        setMessage({ type: 'success', text: 'Setting updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update setting' });
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      setMessage({ type: 'error', text: 'Error updating setting' });
    } finally {
      setSaving(null);
    }
  };

  const handleInputChange = (settingKey: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.settingKey === settingKey 
        ? { ...setting, settingValue: value }
        : setting
    ));
  };

  const handleSave = (settingKey: string) => {
    const setting = settings.find(s => s.settingKey === settingKey);
    if (setting) {
      updateSetting(settingKey, setting.settingValue);
    }
  };

  if (loading) {
    return (
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9050E9]"></div>
          <span className="ml-3 text-white font-montserrat">Loading voting settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <h3 className="font-montserrat font-semibold text-xl text-white mb-4">🗳️ Voting System Settings</h3>
        <p className="text-[#9D9FA9] font-montserrat mb-6">
          Configure voting system parameters and behavior. Changes take effect immediately for new proposals.
        </p>

        {message && (
          <div className={`mb-4 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-500/50 text-green-300' 
              : 'bg-red-500/20 border-red-500/50 text-red-300'
          }`}>
            <p className="font-montserrat">{message.text}</p>
          </div>
        )}

        <div className="space-y-6">
          {settings.map((setting) => (
            <div key={setting.settingKey} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-montserrat font-semibold text-white mb-1">
                    {setting.settingKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <p className="text-[#9D9FA9] font-montserrat text-sm mb-3">
                    {setting.description}
                  </p>
                  <div className="flex items-center gap-3">
                    {setting.settingKey === 'voting_duration_days' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={setting.settingValue}
                          onChange={(e) => handleInputChange(setting.settingKey, e.target.value)}
                          className="bg-white/10 border border-[#9D9FA9] rounded px-3 py-2 text-white font-montserrat w-20 focus:outline-none focus:border-white/40"
                        />
                        <span className="text-[#9D9FA9] font-montserrat">days</span>
                      </div>
                    ) : setting.settingKey === 'min_votes_required' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={setting.settingValue}
                          onChange={(e) => handleInputChange(setting.settingKey, e.target.value)}
                          className="bg-white/10 border border-[#9D9FA9] rounded px-3 py-2 text-white font-montserrat w-20 focus:outline-none focus:border-white/40"
                        />
                        <span className="text-[#9D9FA9] font-montserrat">votes</span>
                      </div>
                    ) : (
                      <select
                        value={setting.settingValue.toLowerCase()}
                        onChange={(e) => handleInputChange(setting.settingKey, e.target.value.toUpperCase())}
                        className="bg-white/10 border border-[#9D9FA9] rounded px-3 py-2 text-white font-montserrat focus:outline-none focus:border-white/40"
                      >
                        <option value="true" className="bg-gray-800">TRUE</option>
                        <option value="false" className="bg-gray-800">FALSE</option>
                      </select>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleSave(setting.settingKey)}
                  disabled={saving === setting.settingKey}
                  className="bg-[#9050E9] hover:bg-[#7A42C7] text-white font-montserrat font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === setting.settingKey ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
              <div className="mt-3 text-xs text-[#9D9FA9] font-montserrat">
                Last updated: {new Date(setting.updatedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
          <h4 className="font-montserrat font-semibold text-blue-300 mb-2">💡 Important Notes</h4>
          <ul className="text-blue-200 font-montserrat text-sm space-y-1">
            <li>• <strong>Voting duration changes only apply to NEW proposals</strong></li>
            <li>• Existing proposals keep their original voting deadline (locked at submission time)</li>
            <li>• Vote changes setting affects all active proposals immediately</li>
            <li>• Minimum votes setting is used for proposal validation</li>
            <li>• When you change voting duration, it will only affect proposals submitted after the change</li>
          </ul>
        </div>
      </div>
    </div>
  );
}