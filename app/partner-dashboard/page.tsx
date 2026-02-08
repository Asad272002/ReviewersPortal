'use client';

import { useState, useEffect, useMemo } from 'react';
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
  date: string; // Submission date
  created_at?: string;
  partner_review: PartnerReview | null;
  milestone_info?: {
    description: string;
    objectives: string[];
    deliverables: string[];
  } | null;
  // Augmented fields for flattened lists
  projectTitle?: string;
  projectId?: string;
  projectLink?: string | null;
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
  projectLink?: string | null;
  reports: MilestoneReport[];
  stats: ProjectStats;
}

export default function PartnerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent' | 'completed' | 'projects'>('pending');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

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

  // Computed Lists
  const allReports = useMemo(() => {
    return projects.flatMap(p => p.reports.map(r => ({
      ...r,
      projectTitle: p.title,
      projectId: p.id,
      projectLink: p.projectLink
    }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [projects]);

  const pendingReports = useMemo(() => allReports.filter(r => !r.partner_review), [allReports]);
  const completedReports = useMemo(() => allReports.filter(r => r.partner_review), [allReports]);
  const recentReports = useMemo(() => allReports.slice(0, 5), [allReports]);

  // Stats
  const stats = {
    pending: pendingReports.length,
    completed: completedReports.length,
    projects: projects.length
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
              <button onClick={handleLogout} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard 
              title="Pending Reviews" 
              value={stats.pending} 
              icon={<svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              bg="bg-yellow-500/10"
              border="border-yellow-500/20"
            />
            <StatCard 
              title="Completed Reviews" 
              value={stats.completed} 
              icon={<svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              bg="bg-green-500/10"
              border="border-green-500/20"
            />
            <StatCard 
              title="Active Projects" 
              value={stats.projects} 
              icon={<svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
              bg="bg-purple-500/10"
              border="border-purple-500/20"
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-white/5 pb-1">
            <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} label="Pending Reviews" count={pendingReports.length} />
            <TabButton active={activeTab === 'recent'} onClick={() => setActiveTab('recent')} label="Recently Shared" />
            <TabButton active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} label="Completed Reviews" />
            <TabButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} label="All Projects" />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              {activeTab === 'projects' ? (
                // Projects Grid View
                <div className="grid gap-6">
                  {projects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      expanded={expandedProject === project.id}
                      onToggle={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                      onReview={handleReviewSubmit}
                      submitting={submitting}
                    />
                  ))}
                  {projects.length === 0 && <EmptyState message="No projects assigned yet." />}
                </div>
              ) : (
                // Reports List View (Pending, Recent, Completed)
                <div className="space-y-6">
                  {(activeTab === 'pending' ? pendingReports : activeTab === 'recent' ? recentReports : completedReports).map((report) => (
                    <div key={report.id} className="relative">
                      {/* Project Context Header for List Items */}
                      <div className="absolute -top-3 left-4 px-3 py-1 bg-[#2A1A4A] rounded-full border border-purple-500/20 text-xs font-medium text-purple-300 z-10 shadow-lg flex items-center gap-2">
                         <span>{report.projectTitle}</span>
                         {report.projectLink && (
                           <a href={report.projectLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="Open Project Proposal">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                           </a>
                         )}
                      </div>
                      <ReportCard 
                        report={report} 
                        onReview={handleReviewSubmit}
                        isSubmitting={submitting === report.id}
                        showProjectContext={false}
                      />
                    </div>
                  ))}
                  
                  {activeTab === 'pending' && pendingReports.length === 0 && (
                    <EmptyState message="No pending reviews! You're all caught up." icon="🎉" />
                  )}
                  {activeTab === 'recent' && recentReports.length === 0 && (
                    <EmptyState message="No recently shared reports." />
                  )}
                  {activeTab === 'completed' && completedReports.length === 0 && (
                    <EmptyState message="No completed reviews yet." />
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function StatCard({ title, value, icon, bg, border }: { title: string, value: number, icon: React.ReactNode, bg: string, border: string }) {
  return (
    <div className={`p-6 rounded-2xl border ${border} ${bg} backdrop-blur-sm relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform scale-150">{icon}</div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-white/10">{icon}</div>
          <h3 className="text-sm font-medium text-white/60">{title}</h3>
        </div>
        <div className="text-3xl font-bold text-white ml-1">{value}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-3 rounded-t-lg text-sm font-medium transition-all relative
        ${active 
          ? 'text-white bg-white/5 border-t border-x border-white/10' 
          : 'text-white/50 hover:text-white hover:bg-white/5'}
      `}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${active ? 'bg-purple-500 text-white' : 'bg-white/10'}`}>
          {count}
        </span>
      )}
      {active && <div className="absolute bottom-[-1px] left-0 w-full h-[1px] bg-[#0C021E]" />}
    </button>
  );
}

function EmptyState({ message, icon = "📂" }: { message: string, icon?: string }) {
  return (
    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-white/40">{message}</p>
    </div>
  );
}

function ProjectCard({ project, expanded, onToggle, onReview, submitting }: { 
  project: Project, 
  expanded: boolean, 
  onToggle: () => void,
  onReview: any,
  submitting: string | null
}) {
  return (
    <div className={`
      bg-[#130b29] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300
      ${expanded ? 'ring-1 ring-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'hover:border-white/10'}
    `}>
      <div onClick={onToggle} className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-semibold text-lg text-white/90">{project.title}</h3>
              {project.projectLink && (
                 <a 
                   href={project.projectLink} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-purple-400 transition-colors"
                   onClick={(e) => e.stopPropagation()}
                   title="View Project Proposal"
                 >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                   </svg>
                 </a>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-white/50">
              <span>{project.reports.length} Reports</span>
              {project.reports.length > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-green-400">{project.stats.approved} Approved</span>
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
        <div className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 bg-black/20 p-6 animate-fadeIn">
          {project.reports.length === 0 ? (
            <div className="text-center py-8 text-white/30 italic">No milestone reports submitted yet.</div>
          ) : (
            <div className="space-y-6">
              {project.reports.map((report) => (
                <ReportCard 
                  key={report.id} 
                  report={report} 
                  onReview={onReview}
                  isSubmitting={submitting === report.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onReview, isSubmitting, showProjectContext = false }: { 
  report: MilestoneReport, 
  onReview: (id: string, verdict: 'Approve' | 'Reject', comment: string) => Promise<void>,
  isSubmitting: boolean,
  showProjectContext?: boolean
}) {
  const [comment, setComment] = useState(report.partner_review?.comment || '');
  const [isEditing, setIsEditing] = useState(!report.partner_review);

  const handleSubmit = async (verdict: 'Approve' | 'Reject') => {
    await onReview(report.id, verdict, comment);
    setIsEditing(false);
  };

  return (
    <div className="bg-[#1a103c] rounded-xl border border-white/5 p-5 pt-7">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs text-purple-400 font-mono">MILESTONE {report.milestone_number}</div>
                <div className="text-xs text-white/30">•</div>
                <div className="text-xs text-white/50">{new Date(report.date).toLocaleDateString()}</div>
              </div>
              <h4 className="font-semibold text-lg text-white/90">{report.milestone_title}</h4>
              
              {report.milestone_info && (
                <div className="mt-2 text-sm text-gray-400">
                  {report.milestone_info.description && (
                    <p className="mb-2 line-clamp-2 hover:line-clamp-none transition-all">{report.milestone_info.description}</p>
                  )}
                  {(() => {
                    if (!report.milestone_info?.deliverables) return null;
                    const deliverables = Array.isArray(report.milestone_info.deliverables) 
                      ? report.milestone_info.deliverables 
                      : typeof report.milestone_info.deliverables === 'string'
                        ? (report.milestone_info.deliverables as string).split(',')
                        : [];
                    
                    if (deliverables.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {deliverables.slice(0, 3).map((del, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300">
                            {del.trim()}
                          </span>
                        ))}
                        {deliverables.length > 3 && (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-500">
                            +{deliverables.length - 3} more
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            {report.document_url && (
              <a href={report.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors border border-blue-500/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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

        <div className="md:w-96 shrink-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-6 pt-4 md:pt-0">
          <div className="text-sm font-semibold text-white/60 mb-3 flex items-center justify-between">
            <span>Partner Verdict</span>
            {!isEditing && report.partner_review && (
              <button onClick={() => setIsEditing(true)} className="text-xs text-purple-400 hover:text-purple-300">Edit Review</button>
            )}
          </div>

          {!isEditing && report.partner_review ? (
            <div className={`p-4 rounded-xl border ${report.partner_review.verdict === 'Approve' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${report.partner_review.verdict === 'Approve' ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={`font-semibold ${report.partner_review.verdict === 'Approve' ? 'text-green-400' : 'text-red-400'}`}>
                  {report.partner_review.verdict}d
                </span>
              </div>
              {report.partner_review.comment && <p className="text-sm text-white/70 italic">"{report.partner_review.comment}"</p>}
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
                <button onClick={() => handleSubmit('Reject')} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium transition-colors disabled:opacity-50">Reject</button>
                <button onClick={() => handleSubmit('Approve')} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-sm font-medium transition-colors disabled:opacity-50">Approve</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
