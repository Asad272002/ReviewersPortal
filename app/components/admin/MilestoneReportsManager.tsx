'use client';

import { useEffect, useState } from 'react';

interface ReportRow {
  reviewer: string;
  proposalId: string;
  proposalTitle: string;
  milestoneTitle: string;
  date: string;
  verdict: string;
  reportLink: string;
}

export default function MilestoneReportsManager() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/milestone-reports');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setReports(json?.reports || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="font-montserrat font-semibold text-xl text-white">Milestone Reports</h3>
        <button onClick={load} className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat py-2 px-4 rounded-lg transition-colors">🔄 Refresh</button>
      </div>

      {error && (<div className="bg-red-600/20 border border-red-500 text-red-300 rounded-xl p-4">{error}</div>)}
      {loading ? (
        <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6 text-center text-white">Loading...</div>
      ) : (
        <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left p-3 font-montserrat text-white">Reviewer</th>
                  <th className="text-left p-3 font-montserrat text-white">Proposal ID</th>
                  <th className="text-left p-3 font-montserrat text-white">Milestone Title</th>
                  <th className="text-left p-3 font-montserrat text-white">Date</th>
                  <th className="text-left p-3 font-montserrat text-white">Verdict</th>
                  <th className="text-left p-3 font-montserrat text-white">View Report</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => (
                  <tr key={idx} className="border-b border-[#9D9FA9] hover:bg-[#1A0A3A]">
                    <td className="p-3 text-[#B8BAC4]">{r.reviewer}</td>
                    <td className="p-3 text-[#B8BAC4]">{r.proposalId}</td>
                    <td className="p-3 text-[#B8BAC4]">{r.milestoneTitle}</td>
                    <td className="p-3 text-[#B8BAC4]">{r.date}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-montserrat ${r.verdict === 'Approved' ? 'bg-green-600/20 text-green-300 border border-green-500' : r.verdict === 'Rejected' ? 'bg-red-600/20 text-red-300 border border-red-500' : 'bg-white/10 text-white border border-white/20'}`}>
                        {r.verdict || '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.reportLink ? (
                        <a className="text-[#9050E9] hover:text-[#A96AFF] underline" href={r.reportLink} target="_blank" rel="noreferrer">Open Sheet</a>
                      ) : (
                        <span className="text-[#B8BAC4]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

