'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface PartnerReview {
  id: string;
  report_id: string;
  verdict: 'Approve' | 'Reject';
  comment: string;
  updated_at: string;
}

interface MilestoneReport {
  id: string;
  milestone_title: string;
  milestone_number: string;
  milestone_budget: string;
  reviewer_username: string;
  document_url: string;
  date: string;
  partner_review: PartnerReview | null;
}

interface ProjectStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

interface Project {
  id: string;
  title: string;
  isRfp: boolean;
  reports: MilestoneReport[];
  stats: ProjectStats;
}

export default function PartnerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/partners/dashboard');
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (reportId: string, verdict: 'Approve' | 'Reject', comment: string) => {
    try {
      setSubmitting(reportId);
      const res = await fetch('/api/partners/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, verdict, comment }),
      });
      
      const data = await res.json();
      if (data.success) {
        // Refresh data to show updated status
        await fetchDashboardData();
      } else {
        alert(data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <ProtectedRoute allowedRoles={['partner']}>
      <div className="min-h-screen bg-[#0C021E] text-white font-sans selection:bg-purple-500/30">
        {/* Header */}
        <header className="fixed top-0 w-full z-50 bg-[#0C021E]/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Partner Portal
                </h1>
                <p className="text-xs text-white/50">RFP Round Oversight</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-white/90">{user?.name}</div>
                <div className="text-xs text-purple-400">Partner Access</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Project Overview</h2>
            <p className="text-white/60">Manage reviews and approvals for RFP Round projects.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="grid gap-6">
              {projects.map((project) => (
                <div 
                  key={project.id}
                  className={`
                    bg-[#130b29] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300
                    ${expandedProject === project.id ? 'ring-1 ring-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'hover:border-white/10'}
                  `}
                >
                  {/* Project Header */}
                  <div 
                    onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                    className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0
                        ${project.stats.pending > 0 
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                          : 'bg-green-500/10 text-green-400 border border-green-500/20'}
                      `}>
                        {project.id.split('-').pop()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-white/90">{project.title}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/50 font-mono">
                            {project.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-white/50">
                          <span>{project.reports.length} Reports</span>
                          {project.reports.length > 0 && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span className="text-green-400">{project.stats.approved} Approved</span>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span className="text-red-400">{project.stats.rejected} Rejected</span>
                              {project.stats.pending > 0 && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-white/20" />
                                  <span className="text-yellow-400">{project.stats.pending} Pending</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <div className={`
                        transition-transform duration-300
                        ${expandedProject === project.id ? 'rotate-180' : ''}
                      `}>
                        <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedProject === project.id && (
                    <div className="border-t border-white/5 bg-black/20 p-6 animate-fadeIn">
                      {project.reports.length === 0 ? (
                        <div className="text-center py-8 text-white/30 italic">
                          No milestone reports submitted yet.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {project.reports.map((report) => (
                            <ReportCard 
                              key={report.id} 
                              report={report} 
                              onReview={handleReviewSubmit}
                              isSubmitting={submitting === report.id}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function ReportCard({ report, onReview, isSubmitting }: { 
  report: MilestoneReport, 
  onReview: (id: string, verdict: 'Approve' | 'Reject', comment: string) => Promise<void>,
  isSubmitting: boolean 
}) {
  const [comment, setComment] = useState(report.partner_review?.comment || '');
  const [isEditing, setIsEditing] = useState(!report.partner_review);

  const handleSubmit = async (verdict: 'Approve' | 'Reject') => {
    await onReview(report.id, verdict, comment);
    setIsEditing(false);
  };

  return (
    <div className="bg-[#1a103c] rounded-xl border border-white/5 p-5">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        {/* Report Details */}
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-purple-400 font-mono mb-1">MILESTONE {report.milestone_number}</div>
              <h4 className="font-semibold text-lg text-white/90">{report.milestone_title}</h4>
            </div>
            {report.document_url && (
              <a 
                href={report.document_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors border border-blue-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View PDF
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-white/40 text-xs mb-1">Reviewer</div>
              <div className="text-white/80 font-medium">{report.reviewer_username}</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-white/40 text-xs mb-1">Budget</div>
              <div className="text-white/80 font-medium">${report.milestone_budget}</div>
            </div>
          </div>
        </div>

        {/* Partner Review Section */}
        <div className="md:w-96 shrink-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-6 pt-4 md:pt-0">
          <div className="text-sm font-semibold text-white/60 mb-3 flex items-center justify-between">
            <span>Partner Verdict</span>
            {!isEditing && report.partner_review && (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Edit Review
              </button>
            )}
          </div>

          {!isEditing && report.partner_review ? (
            <div className={`
              p-4 rounded-xl border
              ${report.partner_review.verdict === 'Approve' 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'}
            `}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${report.partner_review.verdict === 'Approve' ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={`font-semibold ${report.partner_review.verdict === 'Approve' ? 'text-green-400' : 'text-red-400'}`}>
                  {report.partner_review.verdict}d
                </span>
              </div>
              {report.partner_review.comment && (
                <p className="text-sm text-white/70 italic">"{report.partner_review.comment}"</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add your comments here..."
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 min-h-[80px]"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSubmit('Reject')}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleSubmit('Approve')}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
