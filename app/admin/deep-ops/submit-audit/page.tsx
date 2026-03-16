'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import Footer from '../../../components/Footer';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { ExternalLink, RefreshCw } from 'lucide-react';

type MatchQuality = 'no_review' | 'deliverable_id_only' | 'strict_match';

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
  meta: { mode: 'mock' | 'live'; limit: number; offset: number; deliverables: { items_count: number; total: number }; reviews: { items_count: number; total: number } };
  data: { candidates: PreviewCandidate[] };
};

type ApiError = { success: false; message?: string; error?: { message?: string } };

type DeepOpsDeliverable = {
  deliverable_id: number;
  project_code: string;
  milestone_number: number;
  project_title?: string | null;
  status?: string | null;
  created_at?: string | null;
  requested_amount?: number | null;
  remaining_amount?: number | null;
  milestone_price?: number | null;
  description?: string | null;
  ticket?: string | null;
};

type DeepOpsReview = {
  review_id: number;
  project_code: string;
  milestone_number: number;
  deliverable_id?: number | null;
  review_status?: string | null;
  added_date?: string | null;
  audit_date?: string | null;
  audit_feedback?: string | null;
  file_url?: string | null;
};

export default function AdminDeepOpsSubmitAuditPage() {
  const [projectCode, setProjectCode] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidates, setCandidates] = useState<PreviewCandidate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');

  const selectedCandidate = useMemo(() => candidates.find((c) => `${c.key.project_code}:${c.key.milestone_number}:${c.key.deliverable_id}` === selectedKey) ?? null, [candidates, selectedKey]);

  const [deliverableId, setDeliverableId] = useState<string>('');
  const [reviewId, setReviewId] = useState<string>('');

  const [deliverableContext, setDeliverableContext] = useState<DeepOpsDeliverable | null>(null);
  const [reviewContext, setReviewContext] = useState<DeepOpsReview | null>(null);

  const [contextError, setContextError] = useState<string | null>(null);

  const [uploadFileFieldName, setUploadFileFieldName] = useState('file');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadReviewStatus, setUploadReviewStatus] = useState('');
  const [uploadConfirm, setUploadConfirm] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadResult, setUploadResult] = useState<unknown>(null);

  const [auditStatus, setAuditStatus] = useState<'approved' | 'rejected'>('approved');
  const [auditFeedback, setAuditFeedback] = useState('');
  const [auditConfirm, setAuditConfirm] = useState('');
  const [auditPayloadOverride, setAuditPayloadOverride] = useState('');
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditResult, setAuditResult] = useState<unknown>(null);

  useEffect(() => {
    if (!selectedCandidate) return;
    setDeliverableId(String(selectedCandidate.key.deliverable_id));
    setReviewId(selectedCandidate.review ? String(selectedCandidate.review.review_id) : '');
  }, [selectedCandidate]);

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    setContextError(null);
    setCandidates([]);
    setSelectedKey('');
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('offset', '0');
      params.set('includeExternalMilestoneFeed', '1');
      if (projectCode.trim()) params.set('project_code', projectCode.trim());
      const res = await fetch(`/api/admin/deep-ops/preview?${params.toString()}`);
      const json = (await res.json()) as PreviewResponse | ApiError;
      if (!res.ok || (json as any).success === false) {
        const msg = (json as ApiError).message || (json as ApiError).error?.message || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      const data = (json as PreviewResponse).data.candidates;
      setCandidates(data);
    } catch (e: any) {
      setContextError(String(e?.message || e));
    } finally {
      setLoadingCandidates(false);
    }
  };

  const fetchDeliverableById = async () => {
    setContextError(null);
    setDeliverableContext(null);
    const id = Number(deliverableId);
    if (!Number.isFinite(id) || id <= 0) {
      setContextError('Enter a valid deliverable_id');
      return;
    }
    const res = await fetch(`/api/admin/deep-ops/deliverables/${id}`);
    const json = await res.json();
    if (!res.ok || json.success === false) {
      setContextError(json.message || `Failed to load deliverable (${res.status})`);
      return;
    }
    setDeliverableContext(json.data as DeepOpsDeliverable | null);
  };

  const fetchReviewById = async () => {
    setContextError(null);
    setReviewContext(null);
    const id = Number(reviewId);
    if (!Number.isFinite(id) || id <= 0) {
      setContextError('Enter a valid review_id');
      return;
    }
    const res = await fetch(`/api/admin/deep-ops/reviews/${id}`);
    const json = await res.json();
    if (!res.ok || json.success === false) {
      setContextError(json.message || `Failed to load review (${res.status})`);
      return;
    }
    setReviewContext(json.data as DeepOpsReview | null);
  };

  const doUpload = async () => {
    setUploadResult(null);
    if (!uploadFile) {
      setUploadResult({ success: false, message: 'Select a file' });
      return;
    }
    if (uploadConfirm.trim() !== 'UPLOAD') {
      setUploadResult({ success: false, message: 'Type UPLOAD to confirm' });
      return;
    }

    const fd = new FormData();
    fd.set('confirm', 'UPLOAD');
    fd.set('file_field_name', uploadFileFieldName.trim() || 'file');
    fd.set('file', uploadFile, uploadFile.name);
    if (deliverableId.trim()) fd.set('deliverable_id', deliverableId.trim());
    if (projectCode.trim()) fd.set('project_code', projectCode.trim());
    if (selectedCandidate?.key.milestone_number != null) fd.set('milestone_number', String(selectedCandidate.key.milestone_number));
    if (uploadReviewStatus.trim()) fd.set('review_status', uploadReviewStatus.trim());

    setUploadBusy(true);
    try {
      const res = await fetch('/api/admin/deep-ops/reviews/upload', { method: 'POST', body: fd });
      const json = await res.json();
      setUploadResult(json);
    } catch (e: any) {
      setUploadResult({ success: false, message: String(e?.message || e) });
    } finally {
      setUploadBusy(false);
    }
  };

  const doAudit = async () => {
    setAuditResult(null);
    if (auditConfirm.trim() !== 'AUDIT') {
      setAuditResult({ success: false, message: 'Type AUDIT to confirm' });
      return;
    }
    const id = Number(reviewId);
    if (!Number.isFinite(id) || id <= 0) {
      setAuditResult({ success: false, message: 'Enter a valid review_id' });
      return;
    }

    setAuditBusy(true);
    try {
      const res = await fetch('/api/admin/deep-ops/reviews/audit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          confirm: 'AUDIT',
          review_id: id,
          audit_status: auditStatus,
          audit_feedback: auditFeedback,
          payload_override: auditPayloadOverride.trim() ? auditPayloadOverride : undefined,
        }),
      });
      const json = await res.json();
      setAuditResult(json);
    } catch (e: any) {
      setAuditResult({ success: false, message: String(e?.message || e) });
    } finally {
      setAuditBusy(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-[#0C021E] text-white relative overflow-hidden">
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 px-6 md:px-10 pt-8 pb-10">
              <h1 className="text-2xl md:text-3xl font-montserrat font-bold">Deep Ops Submit & Audit</h1>
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
                <div className="font-montserrat font-semibold text-red-200">Testing workspace — real writes</div>
                <div className="text-sm text-red-100/90 mt-2">
                  This page performs real POST/PATCH actions against Deep Ops when you confirm and submit. Use only for controlled admin testing. No portal milestone
                  report generation and no partner workflow actions happen here.
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-montserrat font-semibold text-gray-200">Load context (read-only)</div>
                      <div className="text-xs text-gray-400 mt-1">Use preview candidates or fetch by ID before doing write actions.</div>
                    </div>
                    <button
                      type="button"
                      onClick={loadCandidates}
                      disabled={loadingCandidates}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-montserrat transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingCandidates ? 'animate-spin' : ''}`} />
                      Load
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-400">project_code filter</div>
                      <input
                        value={projectCode}
                        onChange={(e) => setProjectCode(e.target.value)}
                        placeholder="DF-XXXX"
                        className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                      />
                      <div className="text-xs text-gray-400 mt-2">This filter is sent to Deep Ops (server-side) via the admin preview route.</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-400">Candidate selection</div>
                      <select
                        value={selectedKey}
                        onChange={(e) => setSelectedKey(e.target.value)}
                        className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                      >
                        <option value="">Select…</option>
                        {candidates.map((c) => {
                          const k = `${c.key.project_code}:${c.key.milestone_number}:${c.key.deliverable_id}`;
                          const suffix = c.review ? `review#${c.review.review_id}` : 'no review';
                          return (
                            <option key={k} value={k}>
                              {c.key.project_code} · m{c.key.milestone_number} · d{c.key.deliverable_id} · {suffix}
                            </option>
                          );
                        })}
                      </select>
                      <div className="text-xs text-gray-400 mt-2">Loaded: {candidates.length} candidates (first page only).</div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-sm font-montserrat font-semibold text-gray-200">Target (deliverable)</div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          value={deliverableId}
                          onChange={(e) => setDeliverableId(e.target.value)}
                          placeholder="deliverable_id"
                          className="flex-1 rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                        />
                        <button
                          type="button"
                          onClick={fetchDeliverableById}
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-montserrat transition"
                        >
                          Fetch
                        </button>
                      </div>
                      {deliverableContext ? (
                        <div className="mt-3 text-sm text-gray-300">
                          <div className="text-gray-200 font-semibold">{deliverableContext.project_code}</div>
                          <div className="text-xs text-gray-400 mt-1">{deliverableContext.project_title ?? '—'}</div>
                          <div className="text-xs text-gray-400 mt-2">Status: {deliverableContext.status ?? '—'}</div>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-gray-400">No deliverable loaded.</div>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-sm font-montserrat font-semibold text-gray-200">Target (review)</div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          value={reviewId}
                          onChange={(e) => setReviewId(e.target.value)}
                          placeholder="review_id"
                          className="flex-1 rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                        />
                        <button
                          type="button"
                          onClick={fetchReviewById}
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-montserrat transition"
                        >
                          Fetch
                        </button>
                      </div>
                      {reviewContext ? (
                        <div className="mt-3 text-sm text-gray-300">
                          <div className="text-gray-200 font-semibold">
                            #{reviewContext.review_id} {reviewContext.review_status ?? '—'}
                          </div>
                          <div className="text-xs text-gray-400 mt-2">added_date: {reviewContext.added_date ?? '—'}</div>
                          <div className="text-xs text-gray-400 mt-1">audit_date: {reviewContext.audit_date ?? '—'}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            file_url:{' '}
                            {reviewContext.file_url ? (
                              <a href={reviewContext.file_url} target="_blank" rel="noreferrer" className="text-gray-200 hover:text-white underline underline-offset-4">
                                open <ExternalLink className="inline-block w-4 h-4 ml-1" />
                              </a>
                            ) : (
                              '—'
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-gray-400">No review loaded.</div>
                      )}
                    </div>
                  </div>

                  {contextError ? (
                    <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{contextError}</div>
                  ) : null}
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="text-sm font-montserrat font-semibold text-gray-200">Submit/upload review report file</div>
                    <div className="text-xs text-gray-400 mt-1">Sends a real multipart upload to Deep Ops via an internal admin route.</div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400">file field name</div>
                        <input
                          value={uploadFileFieldName}
                          onChange={(e) => setUploadFileFieldName(e.target.value)}
                          className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                        />
                        <div className="text-xs text-gray-400 mt-2">If Deep Ops expects a different file field name, change it here.</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400">review_status (optional)</div>
                        <input
                          value={uploadReviewStatus}
                          onChange={(e) => setUploadReviewStatus(e.target.value)}
                          placeholder="e.g. submitted"
                          className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs uppercase tracking-wider text-gray-400">File</div>
                      <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        className="mt-2 block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-white/10 file:text-gray-200 hover:file:bg-white/15"
                      />
                    </div>

                    <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-wider text-gray-400">Confirmation</div>
                      <div className="text-xs text-gray-400 mt-2">Type UPLOAD to enable the real write call.</div>
                      <input
                        value={uploadConfirm}
                        onChange={(e) => setUploadConfirm(e.target.value)}
                        placeholder="UPLOAD"
                        className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                      <button
                        type="button"
                        onClick={doUpload}
                        disabled={uploadBusy}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-sm font-montserrat transition disabled:opacity-50"
                      >
                        {uploadBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        Submit to Deep Ops
                      </button>
                    </div>

                    {uploadResult ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-gray-200 overflow-auto">
                        <pre>{JSON.stringify(uploadResult, null, 2)}</pre>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="text-sm font-montserrat font-semibold text-gray-200">Audit approve/reject</div>
                    <div className="text-xs text-gray-400 mt-1">Sends a real PATCH audit call to Deep Ops via an internal admin route.</div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400">audit status</div>
                        <select
                          value={auditStatus}
                          onChange={(e) => setAuditStatus(e.target.value as any)}
                          className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                        >
                          <option value="approved">approved</option>
                          <option value="rejected">rejected</option>
                        </select>
                        <div className="text-xs text-gray-400 mt-2">Assumption: Deep Ops accepts audit_status = approved/rejected.</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400">review_id</div>
                        <input
                          value={reviewId}
                          onChange={(e) => setReviewId(e.target.value)}
                          className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs uppercase tracking-wider text-gray-400">audit feedback</div>
                      <textarea
                        value={auditFeedback}
                        onChange={(e) => setAuditFeedback(e.target.value)}
                        className="mt-2 w-full min-h-24 rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                      />
                    </div>

                    <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                      <summary className="text-sm text-gray-200 cursor-pointer">Advanced: payload override (JSON)</summary>
                      <div className="text-xs text-gray-400 mt-2">If Deep Ops expects different keys, provide the exact JSON body to send.</div>
                      <textarea
                        value={auditPayloadOverride}
                        onChange={(e) => setAuditPayloadOverride(e.target.value)}
                        placeholder='{"audit_status":"approved","audit_feedback":"..."}'
                        className="mt-2 w-full min-h-24 rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40"
                      />
                    </details>

                    <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-wider text-gray-400">Confirmation</div>
                      <div className="text-xs text-gray-400 mt-2">Type AUDIT to enable the real write call.</div>
                      <input
                        value={auditConfirm}
                        onChange={(e) => setAuditConfirm(e.target.value)}
                        placeholder="AUDIT"
                        className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                      <button
                        type="button"
                        onClick={doAudit}
                        disabled={auditBusy}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-sm font-montserrat transition disabled:opacity-50"
                      >
                        {auditBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        Send audit to Deep Ops
                      </button>
                    </div>

                    {auditResult ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-gray-200 overflow-auto">
                        <pre>{JSON.stringify(auditResult, null, 2)}</pre>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
