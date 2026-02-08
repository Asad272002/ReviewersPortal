'use client';

import { useEffect, useState, Fragment } from 'react';
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
  ArrowLeft,
  Share2,
  MessageSquare,
  Eye
} from 'lucide-react';

interface PartnerReview {
  id: string;
  verdict: 'Approve' | 'Reject';
  comment: string;
  updated_at: string;
}

interface ReportRow {
  id: string; // Added ID
  reviewer: string;
  proposalId: string;
  proposalTitle: string;
  milestoneTitle: string;
  milestoneNumber: string;
  date: string;
  verdict: string;
  reportLink: string;
  isSharedWithPartner: boolean;
  partnerReview: PartnerReview | null;
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
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

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

  const toggleShare = async (id: string, currentStatus: boolean) => {
    setToggling(id);
    try {
      const res = await fetch(`/api/admin/milestone-reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSharedWithPartner: !currentStatus })
      });
      
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === id ? { ...r, isSharedWithPartner: !currentStatus } : r));
      } else {
        const err = await res.json();
        alert(`Failed to update: ${err.error}`);
      }
    } catch (e) {
      alert('Error updating share status');
    } finally {
      setToggling(null);
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
                  <th className="p-4 text-gray-300 font-bold text-xs uppercase tracking-wider text-center">Shared</th>
                  <th className="p-4 text-gray-300 font-bold text-xs uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredReports.map((r, idx) => (
                  <Fragment key={r.id}>
                  <tr className="hover:bg-white/5 transition-colors group">
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
                      {r.milestoneTitle} <span className="text-white/40 text-xs">#{r.milestoneNumber}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-300 text-sm">
                        <Calendar size={14} className="text-[#9050E9]" />
                        {r.date}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {getVerdictBadge(r.verdict)}
                        {r.partnerReview && (
                          <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-flex self-start ${
                            r.partnerReview.verdict === 'Approve' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            Partner: {r.partnerReview.verdict}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => toggleShare(r.id, r.isSharedWithPartner)}
                        disabled={toggling === r.id}
                        className={`p-2 rounded-lg transition-all ${
                          r.isSharedWithPartner 
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        } ${toggling === r.id ? 'opacity-50 cursor-wait' : ''}`}
                        title={r.isSharedWithPartner ? "Shared with partner" : "Not shared with partner"}
                      >
                        <Share2 size={18} />
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.partnerReview && (
                          <button
                            onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}
                            className={`p-2 rounded-lg transition-all ${expandedReport === r.id ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                            title="View Partner Comments"
                          >
                            <MessageSquare size={16} />
                          </button>
                        )}
                        {r.reportLink ? (
                          <a 
                            href={r.reportLink} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#9050E9]/10 hover:bg-[#9050E9]/20 text-[#9050E9] hover:text-[#A96AFF] text-xs font-medium transition-colors border border-[#9050E9]/20"
                          >
                            View <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-gray-600 text-xs italic">No Link</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Partner Review Details */}
                  {expandedReport === r.id && r.partnerReview && (
                    <tr className="bg-white/5 border-b border-white/5 animate-in fade-in slide-in-from-top-2">
                      <td colSpan={7} className="p-4">
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5 ml-12">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full ${r.partnerReview.verdict === 'Approve' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {r.partnerReview.verdict === 'Approve' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                            </div>
                            <div className="flex-1">
                              <h5 className="text-sm font-semibold text-white mb-1">
                                Partner Feedback: <span className={r.partnerReview.verdict === 'Approve' ? 'text-green-400' : 'text-red-400'}>{r.partnerReview.verdict}</span>
                              </h5>
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {r.partnerReview.comment || "No comments provided."}
                              </p>
                              <div className="mt-2 text-xs text-gray-500">
                                Submitted on {new Date(r.partnerReview.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
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