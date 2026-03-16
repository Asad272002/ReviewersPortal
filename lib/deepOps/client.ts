export type DeepOpsMode = 'mock' | 'live';

import { examplePortalMilestoneReport } from '../mocks/milestoneReport.example';

export type DeepOpsProfile = {
  user_id: number;
  name?: string | null;
  email?: string | null;
  roles?: string[] | null;
};

export type DeepOpsDeliverable = {
  deliverable_id: number;
  created_at?: string | null;
  status?: string | null;
  project_id?: number | null;
  project_title?: string | null;
  project_code: string;
  milestone_id?: number | null;
  milestone_number: number;
  requested_amount?: number | null;
  remaining_amount?: number | null;
  milestone_price?: number | null;
  description?: string | null;
  ticket?: string | null;
  coordinator_id?: number | null;
  reviewer_id?: number | null;
  awarded_team_id?: number | null;
};

export type DeepOpsReview = {
  review_id: number;
  added_date?: string | null;
  review_status?: string | null;
  project_id?: number | null;
  project_title?: string | null;
  project_code: string;
  milestone_id?: number | null;
  milestone_number: number;
  remaining_amount?: number | null;
  milestone_price?: number | null;
  paid_amount?: number | null;
  deliverable_id?: number | null;
  file_url?: string | null;
  reviewer_id?: number | null;
  coordinator_id?: number | null;
  audit_date?: string | null;
  audit_feedback?: string | null;
};

export type DeepOpsUpdatedMilestone = {
  wp_project_id?: number | null;
  project_code: string;
  project_status: string;
  milestone_number: number;
  deliverable_link?: string | null;
  milestone_status: string;
  amount_paid?: number | null;
  transfer_date?: string | null;
};

export type DeepOpsPaginated<T> = {
  items: T[];
  total: number;
};

export type DeepOpsDateRange = {
  start_date: string;
  end_date: string;
};

export type DeepOpsDeliverablesQuery = {
  status?: string;
  project_code?: string;
  date_from?: string;
  date_to?: string;
  offset?: number;
  limit?: number;
};

export type DeepOpsReviewsQuery = {
  status?: string;
  project_code?: string;
  date_from?: string;
  date_to?: string;
  reviewer_id?: number;
  coordinator_id?: number;
  milestone_id?: number;
  offset?: number;
  limit?: number;
};

export type DeepOpsUpdatedMilestonesQuery = DeepOpsDateRange & {
  source?: 'internal' | 'external';
};

export type DeepOpsClient = {
  mode: DeepOpsMode;
  getProfile: () => Promise<DeepOpsProfile>;
  getDeliverables: (query?: DeepOpsDeliverablesQuery) => Promise<DeepOpsPaginated<DeepOpsDeliverable>>;
  getDeliverableById: (deliverableId: number) => Promise<DeepOpsDeliverable | null>;
  getReviews: (query?: DeepOpsReviewsQuery) => Promise<DeepOpsPaginated<DeepOpsReview>>;
  getReviewById: (reviewId: number) => Promise<DeepOpsReview | null>;
  getUpdatedMilestones: (query: DeepOpsUpdatedMilestonesQuery) => Promise<DeepOpsPaginated<DeepOpsUpdatedMilestone> & { source: 'internal' | 'external' }>;
};

type DeepOpsClientOptions = {
  mode: DeepOpsMode;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  requireApiKey?: boolean;
};

function toQueryString(query: Record<string, unknown> | undefined) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

function pickNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  return null;
}

function pickStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const x of v) if (typeof x === 'string') out.push(x);
  return out;
}

function normalizeProfile(json: unknown): DeepOpsProfile {
  const o = (json && typeof json === 'object') ? (json as Record<string, unknown>) : {};
  return {
    user_id: pickNumber(o.user_id) ?? 0,
    name: pickString(o.name),
    email: pickString(o.email),
    roles: pickStringArray(o.roles),
  };
}

function normalizeDeliverable(json: unknown): DeepOpsDeliverable | null {
  const o = (json && typeof json === 'object') ? (json as Record<string, unknown>) : null;
  if (!o) return null;
  const deliverable_id = pickNumber(o.deliverable_id);
  const project_code = pickString(o.project_code);
  const milestone_number = pickNumber(o.milestone_number);
  if (deliverable_id === null || project_code === null || milestone_number === null) return null;
  return {
    deliverable_id,
    created_at: pickString(o.created_at),
    status: pickString(o.status),
    project_id: pickNumber(o.project_id),
    project_title: pickString(o.project_title),
    project_code,
    milestone_id: pickNumber(o.milestone_id),
    milestone_number,
    requested_amount: pickNumber(o.requested_amount),
    remaining_amount: pickNumber(o.remaining_amount),
    milestone_price: pickNumber(o.milestone_price),
    description: pickString(o.description),
    ticket: pickString(o.ticket),
    coordinator_id: pickNumber(o.coordinator_id),
    reviewer_id: pickNumber(o.reviewer_id),
    awarded_team_id: pickNumber(o.awarded_team_id),
  };
}

function normalizeReview(json: unknown): DeepOpsReview | null {
  const o = (json && typeof json === 'object') ? (json as Record<string, unknown>) : null;
  if (!o) return null;
  const review_id = pickNumber(o.review_id);
  const project_code = pickString(o.project_code);
  const milestone_number = pickNumber(o.milestone_number);
  if (review_id === null || project_code === null || milestone_number === null) return null;
  return {
    review_id,
    added_date: pickString(o.added_date),
    review_status: pickString(o.review_status),
    project_id: pickNumber(o.project_id),
    project_title: pickString(o.project_title),
    project_code,
    milestone_id: pickNumber(o.milestone_id),
    milestone_number,
    remaining_amount: pickNumber(o.remaining_amount),
    milestone_price: pickNumber(o.milestone_price),
    paid_amount: pickNumber(o.paid_amount),
    deliverable_id: pickNumber(o.deliverable_id),
    file_url: pickString(o.file_url),
    reviewer_id: pickNumber(o.reviewer_id),
    coordinator_id: pickNumber(o.coordinator_id),
    audit_date: pickString(o.audit_date),
    audit_feedback: pickString(o.audit_feedback),
  };
}

function normalizeUpdatedMilestone(json: unknown): DeepOpsUpdatedMilestone | null {
  const o = (json && typeof json === 'object') ? (json as Record<string, unknown>) : null;
  if (!o) return null;
  const project_code = pickString(o.project_code);
  const project_status = pickString(o.project_status);
  const milestone_number = pickNumber(o.milestone_number);
  const milestone_status = pickString(o.milestone_status);
  if (project_code === null || project_status === null || milestone_number === null || milestone_status === null) return null;
  return {
    wp_project_id: pickNumber(o.wp_project_id),
    project_code,
    project_status,
    milestone_number,
    deliverable_link: pickString(o.deliverable_link),
    milestone_status,
    amount_paid: pickNumber(o.amount_paid),
    transfer_date: pickString(o.transfer_date),
  };
}

function createLiveDeepOpsClient(options: Required<Pick<DeepOpsClientOptions, 'baseUrl'>> & Pick<DeepOpsClientOptions, 'apiKey' | 'timeoutMs' | 'requireApiKey'>): DeepOpsClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const apiKey = (options.apiKey ?? process.env.DEEP_OPS_API_KEY ?? '').trim();
  const timeoutMs = options.timeoutMs ?? 10_000;
  const requireApiKey = options.requireApiKey ?? true;

  if (requireApiKey && !apiKey) {
    throw new Error('Deep Ops live mode requires an API key. Provide options.apiKey or set DEEP_OPS_API_KEY.');
  }

  const get = async <T>(path: string): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        signal: controller.signal,
      });

      const text = await res.text();
      let json: any;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const err = new Error(`Deep Ops GET ${path} failed: ${res.status}`);
        (err as any).status = res.status;
        (err as any).body = json ?? text;
        throw err;
      }

      return json as T;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        const e = new Error(`Deep Ops GET ${path} timed out after ${timeoutMs}ms`);
        (e as any).code = 'DEEP_OPS_TIMEOUT';
        throw e;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    mode: 'live',
    async getProfile() {
      const json = await get<unknown>('/api/v1/auth/profile');
      return normalizeProfile(json);
    },
    async getDeliverables(query) {
      const json = await get<unknown>(`/api/v1/deliverables/${toQueryString(query as any)}`);
      const items: DeepOpsDeliverable[] = [];
      if (Array.isArray(json)) {
        for (const x of json) {
          const d = normalizeDeliverable(x);
          if (d) items.push(d);
        }
      }
      if (json && typeof json === 'object' && !Array.isArray(json)) {
        const o = json as Record<string, unknown>;
        const candidates = [o.items, o.deliverables, o.data];
        for (const c of candidates) {
          if (Array.isArray(c)) {
            for (const x of c) {
              const d = normalizeDeliverable(x);
              if (d) items.push(d);
            }
            const total = pickNumber(o.total) ?? items.length;
            return { items, total };
          }
        }
        const total = pickNumber(o.total) ?? items.length;
        return { items, total };
      }
      return { items, total: items.length };
    },
    async getDeliverableById(deliverableId) {
      const json = await get<unknown>(`/api/v1/deliverables/${encodeURIComponent(String(deliverableId))}`);
      return normalizeDeliverable(json);
    },
    async getReviews(query) {
      const json = await get<unknown>(`/api/v1/reviews${toQueryString(query as any)}`);
      const items: DeepOpsReview[] = [];
      if (Array.isArray(json)) {
        for (const x of json) {
          const r = normalizeReview(x);
          if (r) items.push(r);
        }
        return { items, total: items.length };
      }
      if (json && typeof json === 'object') {
        const o = json as Record<string, unknown>;
        const candidates = [o.items, o.reviews, o.data];
        for (const c of candidates) {
          if (Array.isArray(c)) {
            for (const x of c) {
              const r = normalizeReview(x);
              if (r) items.push(r);
            }
            const total = pickNumber(o.total) ?? items.length;
            return { items, total };
          }
        }
        const knownKeys = Object.keys(o).slice(0, 30).join(', ');
        const err = new Error(`Deep Ops GET /api/v1/reviews returned an unexpected shape (no array, and no items/reviews/data array). Keys: ${knownKeys}`);
        (err as any).code = 'DEEP_OPS_UNEXPECTED_SHAPE';
        throw err;
      }
      const err = new Error('Deep Ops GET /api/v1/reviews returned a non-object, non-array response');
      (err as any).code = 'DEEP_OPS_UNEXPECTED_SHAPE';
      throw err;
    },
    async getReviewById(reviewId) {
      const json = await get<unknown>(`/api/v1/reviews/${encodeURIComponent(String(reviewId))}`);
      return normalizeReview(json);
    },
    async getUpdatedMilestones(query) {
      const source: 'internal' | 'external' = query.source === 'external' ? 'external' : 'internal';
      const path =
        source === 'external'
          ? `/api/v1/external/milestones/updated-milestones${toQueryString({ start_date: query.start_date, end_date: query.end_date })}`
          : `/api/v1/updated-milestones${toQueryString({ start_date: query.start_date, end_date: query.end_date })}`;
      const json = await get<unknown>(path);
      const items: DeepOpsUpdatedMilestone[] = [];
      if (json && typeof json === 'object') {
        const o = json as Record<string, unknown>;
        const milestones = o.milestones;
        if (Array.isArray(milestones)) {
          for (const x of milestones) {
            const m = normalizeUpdatedMilestone(x);
            if (m) items.push(m);
          }
        }
        const total = pickNumber(o.total) ?? items.length;
        return { items, total, source };
      }
      return { items, total: 0, source };
    },
  };
}

function createMockDeepOpsClient(): DeepOpsClient {
  const deliverable: DeepOpsDeliverable = {
    deliverable_id: examplePortalMilestoneReport.deepOpsLink.deep_ops_deliverable_id,
    created_at: examplePortalMilestoneReport.snapshot.deliverable.created_at ?? examplePortalMilestoneReport.created_at,
    status: examplePortalMilestoneReport.snapshot.deliverable.status ?? null,
    project_id: null,
    project_title: examplePortalMilestoneReport.snapshot.project.title ?? null,
    project_code: examplePortalMilestoneReport.deepOpsLink.deep_ops_project_code,
    milestone_id: null,
    milestone_number: examplePortalMilestoneReport.deepOpsLink.deep_ops_milestone_number,
    requested_amount: examplePortalMilestoneReport.snapshot.deliverable.requested_amount ?? null,
    remaining_amount: examplePortalMilestoneReport.snapshot.deliverable.remaining_amount ?? null,
    milestone_price: examplePortalMilestoneReport.snapshot.deliverable.milestone_price ?? examplePortalMilestoneReport.snapshot.milestone.price ?? null,
    description: examplePortalMilestoneReport.snapshot.deliverable.description ?? null,
    ticket: examplePortalMilestoneReport.snapshot.deliverable.ticket ?? null,
    coordinator_id: null,
    reviewer_id: null,
    awarded_team_id: null,
  };

  const review: DeepOpsReview = {
    review_id: 456,
    added_date: examplePortalMilestoneReport.created_at,
    review_status: examplePortalMilestoneReport.internal_outcome,
    project_id: null,
    project_title: examplePortalMilestoneReport.snapshot.project.title ?? null,
    project_code: examplePortalMilestoneReport.deepOpsLink.deep_ops_project_code,
    milestone_id: null,
    milestone_number: examplePortalMilestoneReport.deepOpsLink.deep_ops_milestone_number,
    remaining_amount: deliverable.remaining_amount ?? null,
    milestone_price: deliverable.milestone_price ?? null,
    paid_amount: null,
    deliverable_id: deliverable.deliverable_id,
    file_url: null,
    reviewer_id: null,
    coordinator_id: null,
    audit_date: null,
    audit_feedback: null,
  };

  const updatedMilestone: DeepOpsUpdatedMilestone = {
    wp_project_id: null,
    project_code: examplePortalMilestoneReport.deepOpsLink.deep_ops_project_code,
    project_status: 'active',
    milestone_number: examplePortalMilestoneReport.deepOpsLink.deep_ops_milestone_number,
    deliverable_link: null,
    milestone_status: examplePortalMilestoneReport.snapshot.milestone.status ?? 'submitted',
    amount_paid: null,
    transfer_date: null,
  };

  const profile: DeepOpsProfile = {
    user_id: 9999,
    name: 'Slate Coordinator',
    email: 'slate@example.invalid',
    roles: ['review_coordinator'],
  };

  return {
    mode: 'mock',
    async getProfile() {
      return profile;
    },
    async getDeliverables() {
      return { items: [deliverable], total: 1 };
    },
    async getDeliverableById(deliverableId) {
      if (deliverableId === deliverable.deliverable_id) return deliverable;
      return null;
    },
    async getReviews() {
      return { items: [review], total: 1 };
    },
    async getReviewById(reviewId) {
      if (reviewId === review.review_id) return review;
      return null;
    },
    async getUpdatedMilestones(query) {
      const source: 'internal' | 'external' = query.source === 'external' ? 'external' : 'internal';
      return { items: [updatedMilestone], total: 1, source };
    },
  };
}

export function createDeepOpsClient(options: DeepOpsClientOptions): DeepOpsClient {
  if (options.mode === 'mock') return createMockDeepOpsClient();
  return createLiveDeepOpsClient({
    baseUrl: options.baseUrl ?? 'https://api.deep-operations.ai',
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs,
    requireApiKey: options.requireApiKey,
  });
}
