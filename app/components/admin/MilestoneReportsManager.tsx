'use client';

import { useEffect, useState } from 'react';
import { 
  RefreshCw, 
  Search, 
  FileText, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  User,
  Hash,
  ArrowLeft
} from 'lucide-react';

interface ReportRow {
  reviewer: string;
  proposalId: string;
  proposalTitle: string;
  milestoneTitle: string;
  date: string;
  verdict: string;
  reportLink: string;
}

interface MilestoneReportsManagerProps {
  onBack?: () => void;
}

export default function MilestoneReportsManager({ onBack }: MilestoneReportsManagerProps) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    setLoading(true); 
    setError(null);
    try {
      const res = await fetch('/api/admin/milestone-reports');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json?.reports || [];
      setReports(data);
      setFilteredReports(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const filtered = reports.filter(r => 
      r.reviewer.toLowerCase().includes(lower) || 
      r.proposalId.toLowerCase().includes(lower) ||
      r.proposalTitle.toLowerCase().includes(lower) ||
      r.milestoneTitle.toLowerCase().includes(lower)
    );
    setFilteredReports(filtered);
  }, [searchTerm, reports]);

  const getVerdictBadge = (verdict: string) => {
    switch (verdict?.toLowerCase()) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            <AlertCircle size={12} /> {verdict || 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                title="Back to Overview"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="font-montserrat font-bold text-2xl text-white flex items-center gap-2 drop-shadow-md">
              <FileText className="text-[#9050E9]" />
              Milestone Reports
            </h3>
          </div>
          <p className="text-gray-200 font-medium text-sm mt-1 ml-1">Manage and track milestone submission reports</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#1A0A3A]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9050E9]/50 w-full md:w-64 transition-all"
            />
          </div>
          <button 
            onClick={load} 
            disabled={loading}
            className="p-2 bg-[#9050E9]/20 hover:bg-[#9050E9]/40 text-[#9050E9] rounded-xl border border-[#9050E9]/30 transition-all disabled:opacity-50 group"
          >
            <RefreshCw size={20} className={`group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="bg-[#0C021E]/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-[#9050E9]/30 border-t-[#9050E9] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading reports data...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-500">
              <FileText size={32} />
            </div>
            <h4 className="text-white font-semibold text-lg mb-1">No Reports Found</h4>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              {searchTerm ? `No results matching "${searchTerm}"` : "There are no milestone reports to display at this time."}
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-4 text-[#9050E9] hover:text-[#A96AFF] text-sm font-medium hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/10 border-b border-white/10 text-left">
                  <th className="p-4 text-gray-300 font-bold text-xs uppercase tracking-wider">Reviewer</th>
                  <th className="p-4 text-gray-300 font-bold text-xs uppercase tracking-wider">Proposal Info</th>
                  <th className="p-4 text-gray-300 font-bold text-xs uppercase tracking-wider">Milestone</th>
                  <th className="p-4 text-gray-300 font-bold text-xs uppercase tracking-wider">Date</th>
                  <th className="p-4 text-gray-300 font-bold text-xs uppercase tracking-wider">Status</th>
                  <th className="p-4 text-gray-300 font-bold text-xs uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredReports.map((r, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center border border-white/20 text-xs font-bold text-white shadow-sm">
                          {r.reviewer.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-200 font-semibold">{r.reviewer}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-white text-sm font-semibold line-clamp-1">{r.proposalTitle || 'Untitled Proposal'}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Hash size={10} />
                          <span>{r.proposalId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300 text-sm font-medium">
                      {r.milestoneTitle}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-300 text-sm">
                        <Calendar size={14} className="text-[#9050E9]" />
                        {r.date}
                      </div>
                    </td>
                    <td className="p-4">
                      {getVerdictBadge(r.verdict)}
                    </td>
                    <td className="p-4 text-right">
                      {r.reportLink ? (
                        <a 
                          href={r.reportLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#9050E9]/10 hover:bg-[#9050E9]/20 text-[#9050E9] hover:text-[#A96AFF] text-xs font-medium transition-colors border border-[#9050E9]/20"
                        >
                          View Sheet <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs italic">No Link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="text-right text-xs text-gray-600 px-2">
        Showing {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
      </div>
    </div>
  );
}