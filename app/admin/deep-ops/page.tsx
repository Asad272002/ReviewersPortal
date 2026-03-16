'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import ProtectedRoute from '../../components/ProtectedRoute';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, RefreshCw } from 'lucide-react';

type MatchQuality = 'no_review' | 'deliverable_id_only' | 'strict_match';
type WorkflowStatus = 'Needs Review' | 'Review in Progress' | 'Reviewed' | 'Needs Attention';

type PreviewCandidate = {
  key: { project_code: string; milestone_number: number; deliverable_id: number };
  match_quality: MatchQuality;
  mismatch_reasons: string[] | null;
  deep_ops: { deliverable_id: number; review_id: number | null };
  deliverable: {
    status: string | null;
    project_title: string | null;
    requested_amount: number | null;
    remaining_amount: number | null;
    milestone_price: number | null;
    description: string | null;
    ticket: string | null;
    created_at: string | null;
  };
  links: {
    external_deliverable_link: string | null;
  };
  review: {
    review_id: number;
    review_status: string | null;
    added_date: string | null;
    audited: boolean;
    audit_date: string | null;
    audit_feedback: string | null;
    file_url: string | null;
  } | null;
};

type PreviewResponse = {
  success: true;
  meta: {
    mode: 'mock' | 'live';
    note: string;
    filters?: {
      project_code: string | null;
      deliverable_status: string | null;
      review_status: string | null;
    };
    limit: number;
    offset: number;
    deliverables: { items_count: number; total: number };
    reviews: { items_count: number; total: number };
    externalMilestoneFeed:
      | {
          note: string;
          items_count: number;
          total: number;
          start_date: string;
          end_date: string;
        }
      | null;
  };
  data: {
    summary: {
      total_candidates: number;
      match_quality: { strict_match: number; deliverable_id_only: number; no_review: number };
      mismatches: Record<string, number>;
      links: {
        review_file_url_present: number;
        external_deliverable_link_present: number;
        external_feed_items_with_deliverable_link: number;
      };
    };
    candidates: PreviewCandidate[];
  };
};

type PreviewErrorResponse = {
  success: false;
  message?: string;
  error?: { category: string; message: string; status?: number; code?: string };
};

function formatDateISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function badgeClassForMatchQuality(q: MatchQuality) {
  if (q === 'strict_match') return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
  if (q === 'deliverable_id_only') return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
  return 'bg-slate-500/15 text-slate-200 border-slate-500/30';
}

function badgeClassForWorkflowStatus(s: WorkflowStatus) {
  if (s === 'Reviewed') return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
  if (s === 'Review in Progress') return 'bg-blue-500/15 text-blue-200 border-blue-500/30';
  if (s === 'Needs Attention') return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
  return 'bg-slate-500/15 text-slate-200 border-slate-500/30';
}

function normalizeStatus(s: string | null) {
  return String(s || '').trim().toLowerCase();
}

function isFinalReviewStatus(s: string | null) {
  const v = normalizeStatus(s);
  if (!v) return false;
  if (v.includes('approved')) return true;
  if (v.includes('rejected')) return true;
  if (v === 'approve' || v === 'reject') return true;
  return false;
}

function inferWorkflow(candidate: PreviewCandidate): {
  workflow_status: WorkflowStatus;
  recommended_action: string;
  may_need_audit: boolean;
} {
  const hasReview = Boolean(candidate.review);
  const final = hasReview ? isFinalReviewStatus(candidate.review?.review_status ?? null) : false;
  const mayNeedAudit = hasReview ? Boolean(candidate.review && !candidate.review.audited && !final) : false;

  if (candidate.match_quality === 'deliverable_id_only') {
    return {
      workflow_status: 'Needs Attention',
      recommended_action: 'Verify linkage',
      may_need_audit: mayNeedAudit,
    };
  }

  if (!hasReview) {
    return {
      workflow_status: 'Needs Review',
      recommended_action: 'Review milestone',
      may_need_audit: false,
    };
  }

  if (final) {
    return {
      workflow_status: 'Reviewed',
      recommended_action: 'Inspect review record',
      may_need_audit: false,
    };
  }

  return {
    workflow_status: 'Review in Progress',
    recommended_action: 'Complete review / audit',
    may_need_audit: true,
  };
}

export default function AdminDeepOpsPreviewPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowStatus | 'all'>('all');
  const [deliverableStatusFilter, setDeliverableStatusFilter] = useState<string>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('all');
  const [onlyWithReviewFile, setOnlyWithReviewFile] = useState(false);
  const [onlyWithExternalLink, setOnlyWithExternalLink] = useState(false);
  const [onlyReviewed, setOnlyReviewed] = useState(false);

  const [pageSize, setPageSize] = useState(50);
  const [pageIndex, setPageIndex] = useState(0);

  const [serverProjectCodeDraft, setServerProjectCodeDraft] = useState('');
  const [serverProjectCode, setServerProjectCode] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 13);
    return { start_date: formatDateISO(start), end_date: formatDateISO(end) };
  }, []);

  const fetchPreview = async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('offset', String(pageIndex * pageSize));
      params.set('includeExternalMilestoneFeed', '1');
      params.set('start_date', dateRange.start_date);
      params.set('end_date', dateRange.end_date);
      if (serverProjectCode) params.set('project_code', serverProjectCode);

      const res = await fetch(`/api/admin/deep-ops/preview?${params.toString()}`, { method: 'GET' });
      const json = (await res.json()) as PreviewResponse | PreviewErrorResponse;

      if (!res.ok || !('success' in json) || json.success === false) {
        const message =
          (json as PreviewErrorResponse).message ||
          (json as PreviewErrorResponse).error?.message ||
          `Request failed (${res.status})`;
        throw new Error(message);
      }

      setData(json as PreviewResponse);
    } catch (e: any) {
      setData(null);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setExpandedKey(null);
    fetchPreview(false);
  }, [dateRange.end_date, dateRange.start_date, pageIndex, pageSize, serverProjectCode]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    camera.position.z = 5;

    const particles = new THREE.BufferGeometry();
    const count = 110;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 20;
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({ size: 0.05, color: 0x9050e9, transparent: true, opacity: 0.45 });
    const points = new THREE.Points(particles, material);
    scene.add(points);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      points.rotation.y += 0.0012;
      points.rotation.x += 0.0006;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      particles.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  const enriched = useMemo(() => {
    if (!data) return [];
    return data.data.candidates.map((c) => ({ c, wf: inferWorkflow(c) }));
  }, [data]);

  const deliverableStatusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const { c } of enriched) {
      const s = String(c.deliverable.status || '').trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  const reviewStatusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const { c } of enriched) {
      const s = String(c.review?.review_status || '').trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter(({ c, wf }) => {
      if (onlyReviewed && wf.workflow_status !== 'Reviewed') return false;
      if (workflowFilter !== 'all' && wf.workflow_status !== workflowFilter) return false;
      if (deliverableStatusFilter !== 'all' && String(c.deliverable.status || '') !== deliverableStatusFilter) return false;
      if (reviewStatusFilter !== 'all' && String(c.review?.review_status || '') !== reviewStatusFilter) return false;
      if (onlyWithReviewFile && !c.review?.file_url) return false;
      if (onlyWithExternalLink && !c.links?.external_deliverable_link) return false;
      return true;
    });
  }, [deliverableStatusFilter, enriched, onlyReviewed, onlyWithExternalLink, onlyWithReviewFile, reviewStatusFilter, workflowFilter]);

  const filteredCounts = useMemo(() => {
    const counts = { needsReview: 0, inProgress: 0, reviewed: 0, needsAttention: 0 };
    let reviewFileUrl = 0;
    let externalDeliverableLink = 0;
    for (const { c, wf } of filtered) {
      if (wf.workflow_status === 'Needs Review') counts.needsReview += 1;
      if (wf.workflow_status === 'Review in Progress') counts.inProgress += 1;
      if (wf.workflow_status === 'Reviewed') counts.reviewed += 1;
      if (wf.workflow_status === 'Needs Attention') counts.needsAttention += 1;
      if (c.review?.file_url) reviewFileUrl += 1;
      if (c.links?.external_deliverable_link) externalDeliverableLink += 1;
    }
    return { ...counts, reviewFileUrl, externalDeliverableLink };
  }, [filtered]);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-[#0C021E] text-white relative overflow-hidden">
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full opacity-40 pointer-events-none" />
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 px-6 md:px-10 pt-8 pb-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-montserrat font-bold">Deep Ops Admin Preview</h1>
                  <p className="text-sm text-gray-300 mt-2 max-w-3xl">
                    Exploratory admin-only view of existing Deep Ops milestone deliverables and review/submission records. Read-only: no writes.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    External milestone feed is included as supplemental reconciliation context only (same feed used by the main Deep site).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchPreview(true)}
                  disabled={loading || refreshing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-montserrat transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="mt-8">
                {loading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300">Loading preview…</div>
                ) : error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">{error}</div>
                ) : !data ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300">No data.</div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-xs uppercase tracking-wider text-gray-400">Filter note</div>
                          <div className="mt-2 text-xs text-gray-400">
                            Dropdown filters and quick toggles apply to the currently loaded page. Use pagination to inspect older pages. Use server filter by project_code for targeted lookups across pages.
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-[560px]">
                          <div>
                            <div className="text-xs uppercase tracking-wider text-gray-400">Workflow</div>
                            <select
                              value={workflowFilter}
                              onChange={(e) => setWorkflowFilter(e.target.value as any)}
                              className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                            >
                              <option value="all">All</option>
                              <option value="Needs Review">Needs Review</option>
                              <option value="Review in Progress">Review in Progress</option>
                              <option value="Reviewed">Reviewed</option>
                              <option value="Needs Attention">Needs Attention</option>
                            </select>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wider text-gray-400">Deliverable status</div>
                            <select
                              value={deliverableStatusFilter}
                              onChange={(e) => setDeliverableStatusFilter(e.target.value)}
                              className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                            >
                              <option value="all">All</option>
                              {deliverableStatusOptions.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wider text-gray-400">Review status</div>
                            <select
                              value={reviewStatusFilter}
                              onChange={(e) => setReviewStatusFilter(e.target.value)}
                              className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                            >
                              <option value="all">All</option>
                              {reviewStatusOptions.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wider text-gray-400">Server filter (project_code)</div>
                          <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2">
                            <input
                              value={serverProjectCodeDraft}
                              onChange={(e) => setServerProjectCodeDraft(e.target.value)}
                              placeholder="Enter project code (e.g. DF-XXXX) to search across pages…"
                              className="flex-1 rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const v = serverProjectCodeDraft.trim();
                                  setPageIndex(0);
                                  setServerProjectCode(v ? v : null);
                                }}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-montserrat transition"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setServerProjectCodeDraft('');
                                  setPageIndex(0);
                                  setServerProjectCode(null);
                                }}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-montserrat transition"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-400">
                            Applied: <span className="text-gray-200">{serverProjectCode ?? 'none'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wider text-gray-400">Quick toggles (current page)</div>
                          <div className="mt-3 space-y-2 text-sm">
                            <label className="flex items-center gap-3 text-gray-200">
                              <input type="checkbox" checked={onlyWithReviewFile} onChange={(e) => setOnlyWithReviewFile(e.target.checked)} />
                              Only rows with review file_url
                            </label>
                            <label className="flex items-center gap-3 text-gray-200">
                              <input type="checkbox" checked={onlyWithExternalLink} onChange={(e) => setOnlyWithExternalLink(e.target.checked)} />
                              Only rows with external deliverable_link
                            </label>
                            <label className="flex items-center gap-3 text-gray-200">
                              <input type="checkbox" checked={onlyReviewed} onChange={(e) => setOnlyReviewed(e.target.checked)} />
                              Only reviewed rows
                            </label>
                          </div>
                        </div>

                          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wider text-gray-400">Pagination</div>
                          {(() => {
                            const total = data.meta.deliverables.total;
                            const totalPages = total > pageSize ? Math.max(1, Math.ceil(total / pageSize)) : null;
                            const canPrev = pageIndex > 0;
                            const canNext = data.meta.deliverables.items_count === pageSize;
                            return (
                              <>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <div className="text-sm text-gray-200">
                                    Page <span className="font-semibold">{pageIndex + 1}</span>
                                    {totalPages ? (
                                      <>
                                        {' '}
                                        of <span className="font-semibold">{totalPages}</span>
                                      </>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={!canPrev}
                                      onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-montserrat transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <ChevronLeft className="w-4 h-4" /> Prev
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!canNext}
                                      onClick={() => setPageIndex((p) => p + 1)}
                                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-montserrat transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <div className="text-xs text-gray-400">
                                    offset <span className="text-gray-200">{pageIndex * pageSize}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-xs uppercase tracking-wider text-gray-400">Page size</div>
                                    <select
                                      value={pageSize}
                                      onChange={(e) => {
                                        const n = Number(e.target.value);
                                        setPageIndex(0);
                                        setPageSize(n);
                                      }}
                                      className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                                    >
                                      <option value={10}>10</option>
                                      <option value={25}>25</option>
                                      <option value={50}>50</option>
                                    </select>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      </div>

                      <div className="mt-4 text-xs text-gray-400">
                        Showing <span className="text-gray-200 font-semibold">{filtered.length}</span> of{' '}
                        <span className="text-gray-200 font-semibold">{data.data.summary.total_candidates}</span> deliverables in this preview window.
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-xs uppercase tracking-wider text-gray-400">Showing</div>
                        <div className="text-2xl font-semibold mt-2 text-gray-200">{filtered.length}</div>
                        <div className="text-xs text-gray-400 mt-1">Filtered view</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-xs uppercase tracking-wider text-gray-400">Needs Review</div>
                        <div className="text-2xl font-semibold mt-2 text-slate-200">{filteredCounts.needsReview}</div>
                        <div className="text-xs text-gray-400 mt-1">No review record found</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-xs uppercase tracking-wider text-gray-400">Review in Progress</div>
                        <div className="text-2xl font-semibold mt-2 text-blue-200">{filteredCounts.inProgress}</div>
                        <div className="text-xs text-gray-400 mt-1">Review exists but not finalized</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-xs uppercase tracking-wider text-gray-400">Reviewed</div>
                        <div className="text-2xl font-semibold mt-2 text-emerald-200">{filteredCounts.reviewed}</div>
                        <div className="text-xs text-gray-400 mt-1">Approved or rejected</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-xs uppercase tracking-wider text-gray-400">Needs Attention</div>
                        <div className="text-2xl font-semibold mt-2 text-amber-200">{filteredCounts.needsAttention}</div>
                        <div className="text-xs text-gray-400 mt-1">Low-confidence linkage</div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-montserrat font-semibold">Workflow meaning</div>
                            <div className="text-xs text-gray-400 mt-1">
                              Status is derived from review presence, review status, and match quality. Technical match info is shown per row as a secondary badge.
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            Mode: <span className="text-gray-200">{data.meta.mode}</span>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-300">
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="font-montserrat font-semibold text-gray-200">Needs Review</div>
                            <div className="text-gray-400 mt-1">No review found → deliverable not reviewed in Deep Ops.</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="font-montserrat font-semibold text-gray-200">Review in Progress</div>
                            <div className="text-gray-400 mt-1">Review exists but not approved/rejected → may need audit/finalization.</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="font-montserrat font-semibold text-gray-200">Needs Attention</div>
                            <div className="text-gray-400 mt-1">Low-confidence match → verify linkage before using as an input.</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-sm font-montserrat font-semibold">Links availability</div>
                        <div className="text-xs text-gray-400 mt-1">What Deep Ops provides in this preview window.</div>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Review file_url present</span>
                            <span className="text-gray-200 font-semibold">{data.data.summary.links.review_file_url_present}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">External deliverable_link present</span>
                            <span className="text-gray-200 font-semibold">{data.data.summary.links.external_deliverable_link_present}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400">
                          deliverable_link comes from the external milestone feed and is supplemental context. file_url is per-review and may be absent.
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="text-sm font-montserrat font-semibold">Mismatch summary</div>
                      <div className="text-xs text-gray-400 mt-1">Counts of mismatch reasons for non-strict matches.</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.keys(data.data.summary.mismatches).length === 0 ? (
                          <div className="text-sm text-gray-300">No mismatches detected.</div>
                        ) : (
                          Object.entries(data.data.summary.mismatches)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([k, v]) => (
                              <div key={k} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm">
                                <span className="text-gray-300">{k}</span>
                                <span className="text-gray-200 font-semibold">{v}</span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-montserrat font-semibold">Deep Ops deliverables & reviews (preview)</div>
                          <div className="text-xs text-gray-400 mt-1">{data.meta.note}</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          API page size <span className="text-gray-200">{data.meta.limit}</span> · offset{' '}
                          <span className="text-gray-200">{data.meta.offset}</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-[1500px] w-full text-left text-sm">
                          <thead className="bg-black/20">
                            <tr className="text-xs uppercase tracking-wider text-gray-400">
                              <th className="px-5 py-3">Project</th>
                              <th className="px-5 py-3">Milestone</th>
                              <th className="px-5 py-3">Deliverable</th>
                              <th className="px-5 py-3">Workflow status</th>
                              <th className="px-5 py-3">Recommended action</th>
                              <th className="px-5 py-3">Deliverable status</th>
                              <th className="px-5 py-3">Review</th>
                              <th className="px-5 py-3">Links</th>
                              <th className="px-5 py-3">Match (tech)</th>
                              <th className="px-5 py-3 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(({ c, wf }) => {
                                const statusClass = badgeClassForWorkflowStatus(wf.workflow_status);
                                const rowKey = `${c.key.project_code}:${c.key.milestone_number}:${c.key.deliverable_id}`;
                                const isExpanded = expandedKey === rowKey;
                                return (
                              <Fragment key={rowKey}>
                              <tr className="border-t border-white/10">
                                <td className="px-5 py-3">
                                  <div className="font-montserrat font-semibold text-gray-200">{c.key.project_code}</div>
                                  <div className="text-xs text-gray-400 mt-1">{c.deliverable.project_title ?? '—'}</div>
                                </td>
                                <td className="px-5 py-3 text-gray-200">{c.key.milestone_number}</td>
                                <td className="px-5 py-3 text-gray-200">{c.key.deliverable_id}</td>
                                <td className="px-5 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs ${statusClass}`}>
                                    {wf.workflow_status}
                                  </span>
                                  {wf.may_need_audit && <div className="text-xs text-gray-400 mt-1">May need audit</div>}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="text-gray-200 font-montserrat font-semibold">{wf.recommended_action}</div>
                                  {wf.workflow_status === 'Needs Attention' && (
                                    <div className="text-xs text-gray-400 mt-1">Check mismatch reason(s) before relying on this match.</div>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-gray-200">{c.deliverable.status ?? '—'}</td>
                                <td className="px-5 py-3">
                                  {c.review ? (
                                    <div className="space-y-1">
                                      <div className="text-gray-200">
                                        <span className="font-semibold">#{c.review.review_id}</span> {c.review.review_status ?? '—'}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {c.review.added_date ?? '—'} · {c.review.audited ? 'Audited' : 'Not audited'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-gray-400">—</div>
                                  )}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-3">
                                    {c.review?.file_url ? (
                                      <a
                                        href={c.review.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-gray-200 hover:text-white underline underline-offset-4"
                                      >
                                        file <ExternalLink className="inline-block w-4 h-4 ml-1" />
                                      </a>
                                    ) : (
                                      <span className="text-gray-400">file —</span>
                                    )}
                                    {c.links?.external_deliverable_link ? (
                                      <a
                                        href={c.links.external_deliverable_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-gray-200 hover:text-white underline underline-offset-4"
                                      >
                                        deliverable <ExternalLink className="inline-block w-4 h-4 ml-1" />
                                      </a>
                                    ) : (
                                      <span className="text-gray-400">deliverable —</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${badgeClassForMatchQuality(c.match_quality)}`}>
                                      {c.match_quality}
                                    </span>
                                  </div>
                                  {c.mismatch_reasons && c.mismatch_reasons.length ? (
                                    <div className="text-xs text-amber-200 mt-2">{c.mismatch_reasons.join(', ')}</div>
                                  ) : null}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedKey(isExpanded ? null : rowKey)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-montserrat transition"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    {isExpanded ? 'Hide' : 'View'}
                                  </button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="border-t border-white/10 bg-black/10">
                                  <td colSpan={10} className="px-5 py-5">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <div className="text-sm font-montserrat font-semibold text-gray-200">Deliverable record</div>
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">deliverable_id</div>
                                            <div className="text-gray-200 mt-1">{c.key.deliverable_id}</div>
                                          </div>
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">project_code</div>
                                            <div className="text-gray-200 mt-1">{c.key.project_code}</div>
                                          </div>
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">project_title</div>
                                            <div className="text-gray-200 mt-1">{c.deliverable.project_title ?? '—'}</div>
                                          </div>
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">milestone_number</div>
                                            <div className="text-gray-200 mt-1">{c.key.milestone_number}</div>
                                          </div>
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">status</div>
                                            <div className="text-gray-200 mt-1">{c.deliverable.status ?? '—'}</div>
                                          </div>
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">created_at</div>
                                            <div className="text-gray-200 mt-1">{c.deliverable.created_at ?? '—'}</div>
                                          </div>
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">requested_amount</div>
                                            <div className="text-gray-200 mt-1">{c.deliverable.requested_amount ?? '—'}</div>
                                          </div>
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">remaining_amount</div>
                                            <div className="text-gray-200 mt-1">{c.deliverable.remaining_amount ?? '—'}</div>
                                          </div>
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">milestone_price</div>
                                            <div className="text-gray-200 mt-1">{c.deliverable.milestone_price ?? '—'}</div>
                                          </div>
                                          <div className="text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">ticket</div>
                                            <div className="text-gray-200 mt-1">{c.deliverable.ticket ?? '—'}</div>
                                          </div>
                                          <div className="md:col-span-2 text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">description</div>
                                            <div className="text-gray-200 mt-1 whitespace-pre-wrap break-words">{c.deliverable.description ?? '—'}</div>
                                          </div>
                                          <div className="md:col-span-2 text-gray-400">
                                            <div className="text-xs uppercase tracking-wider">external deliverable_link</div>
                                            {c.links?.external_deliverable_link ? (
                                              <a
                                                href={c.links.external_deliverable_link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-1 inline-flex items-center gap-2 text-gray-200 hover:text-white underline underline-offset-4"
                                              >
                                                Open deliverable link <ExternalLink className="w-4 h-4" />
                                              </a>
                                            ) : (
                                              <div className="text-gray-200 mt-1">—</div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <div className="text-sm font-montserrat font-semibold text-gray-200">Review record</div>
                                        {c.review ? (
                                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            <div className="text-gray-400">
                                              <div className="text-xs uppercase tracking-wider">review_id</div>
                                              <div className="text-gray-200 mt-1">{c.review.review_id}</div>
                                            </div>
                                            <div className="text-gray-400">
                                              <div className="text-xs uppercase tracking-wider">review_status</div>
                                              <div className="text-gray-200 mt-1">{c.review.review_status ?? '—'}</div>
                                            </div>
                                            <div className="text-gray-400">
                                              <div className="text-xs uppercase tracking-wider">added_date</div>
                                              <div className="text-gray-200 mt-1">{c.review.added_date ?? '—'}</div>
                                            </div>
                                            <div className="text-gray-400">
                                              <div className="text-xs uppercase tracking-wider">audit_date</div>
                                              <div className="text-gray-200 mt-1">{c.review.audit_date ?? '—'}</div>
                                            </div>
                                            <div className="md:col-span-2 text-gray-400">
                                              <div className="text-xs uppercase tracking-wider">audit_feedback</div>
                                              <div className="mt-1 max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 text-gray-200 whitespace-pre-wrap break-words">
                                                {c.review.audit_feedback ?? '—'}
                                              </div>
                                            </div>
                                            <div className="md:col-span-2 text-gray-400">
                                              <div className="text-xs uppercase tracking-wider">file_url</div>
                                              {c.review.file_url ? (
                                                <a
                                                  href={c.review.file_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="mt-1 inline-flex items-center gap-2 text-gray-200 hover:text-white underline underline-offset-4"
                                                >
                                                  Open file <ExternalLink className="w-4 h-4" />
                                                </a>
                                              ) : (
                                                <div className="text-gray-200 mt-1">—</div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="mt-3 text-sm text-gray-400">No review record attached.</div>
                                        )}

                                        <div className="mt-4 pt-4 border-t border-white/10">
                                          <div className="text-xs uppercase tracking-wider text-gray-400">Match diagnostics</div>
                                          <div className="mt-2 flex items-center gap-2">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${badgeClassForMatchQuality(c.match_quality)}`}>
                                              {c.match_quality}
                                            </span>
                                            {c.mismatch_reasons && c.mismatch_reasons.length ? (
                                              <span className="text-xs text-amber-200">{c.mismatch_reasons.join(', ')}</span>
                                            ) : (
                                              <span className="text-xs text-gray-400">—</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              </Fragment>
                                );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {data.meta.externalMilestoneFeed && (
                      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <div className="text-sm font-montserrat font-semibold">External milestone feed (supplemental)</div>
                            <div className="text-xs text-gray-400 mt-1">{data.meta.externalMilestoneFeed.note}</div>
                          </div>
                          <div className="text-xs text-gray-400">
                            Range: <span className="text-gray-200">{data.meta.externalMilestoneFeed.start_date}</span> →{' '}
                            <span className="text-gray-200">{data.meta.externalMilestoneFeed.end_date}</span>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-gray-300">
                          Items: <span className="text-gray-200 font-semibold">{data.meta.externalMilestoneFeed.items_count}</span> · Total:{' '}
                          <span className="text-gray-200 font-semibold">{data.meta.externalMilestoneFeed.total}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
