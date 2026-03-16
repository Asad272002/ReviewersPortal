import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtAndGetUser } from '@/lib/auth/admin-auth';
import { createDeepOpsClient } from '@/lib/deepOps/client';
import { buildPortalReportCandidates } from '@/lib/deepOps/mappers';

export const runtime = 'nodejs';

type ErrorCategory = 'timeout' | 'unexpected_shape' | 'auth' | 'missing_api_key' | 'api_error' | 'unknown';

function categorizeError(err: any): { category: ErrorCategory; message: string; status?: number; code?: string } {
  const status = typeof err?.status === 'number' ? err.status : undefined;
  const code = typeof err?.code === 'string' ? err.code : undefined;
  const message = String(err?.message || err);

  if (code === 'DEEP_OPS_TIMEOUT') return { category: 'timeout', message, status, code };
  if (code === 'DEEP_OPS_UNEXPECTED_SHAPE') return { category: 'unexpected_shape', message, status, code };
  if (status === 401 || status === 403) return { category: 'auth', message, status, code };
  if (message.toLowerCase().includes('requires an api key')) return { category: 'missing_api_key', message, status, code };
  if (status) return { category: 'api_error', message, status, code };
  return { category: 'unknown', message, status, code };
}

function clampInt(v: string | null, fallback: number, min: number, max: number) {
  const n = v == null ? NaN : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function resolveDeepOpsPreviewMode() {
  const enableLive = (process.env.DEEP_OPS_PREVIEW_ENABLE_LIVE || '').trim() === '1';
  if (process.env.NODE_ENV !== 'production' && !enableLive) return 'mock' as const;
  return 'live' as const;
}

export async function GET(request: NextRequest) {
  const user = await verifyJwtAndGetUser(request);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  const previewMode = resolveDeepOpsPreviewMode();

  const url = new URL(request.url);
  const limit = clampInt(url.searchParams.get('limit'), 10, 1, 50);
  const offset = clampInt(url.searchParams.get('offset'), 0, 0, 10_000);
  const includeExternalMilestoneFeed = url.searchParams.get('includeExternalMilestoneFeed') === '1';
  const projectCode = (url.searchParams.get('project_code') || '').trim() || undefined;
  const deliverableStatus = (url.searchParams.get('deliverable_status') || '').trim() || undefined;
  const reviewStatus = (url.searchParams.get('review_status') || '').trim() || undefined;

  const startDate = url.searchParams.get('start_date') || '2026-03-01';
  const endDate = url.searchParams.get('end_date') || '2026-03-14';

  try {
    const client = createDeepOpsClient({ mode: previewMode });

    const [deliverablesRes, reviewsRes, milestoneFeedRes] = await Promise.all([
      client.getDeliverables({ limit, offset, project_code: projectCode, status: deliverableStatus }),
      client.getReviews({ limit, offset, project_code: projectCode, status: reviewStatus }),
      includeExternalMilestoneFeed
        ? client.getUpdatedMilestones({ start_date: startDate, end_date: endDate, source: 'external' })
        : Promise.resolve(null),
    ]);

    const candidates = buildPortalReportCandidates({
      deliverables: deliverablesRes.items,
      reviews: reviewsRes.items,
    });

    const milestoneDeliverableLinkByKey = new Map<string, string>();
    if (milestoneFeedRes?.items?.length) {
      for (const m of milestoneFeedRes.items) {
        const link = m.deliverable_link;
        if (!link) continue;
        const k = `${m.project_code}:${m.milestone_number}`;
        if (!milestoneDeliverableLinkByKey.has(k)) milestoneDeliverableLinkByKey.set(k, link);
      }
    }

    const mismatchCounts: Record<string, number> = {};
    let strictMatchCount = 0;
    let deliverableIdOnlyCount = 0;
    let noReviewCount = 0;
    let reviewFileUrlPresentCount = 0;
    let externalDeliverableLinkPresentCount = 0;

    for (const c of candidates) {
      if (c.match_quality === 'strict_match') strictMatchCount += 1;
      if (c.match_quality === 'deliverable_id_only') deliverableIdOnlyCount += 1;
      if (c.match_quality === 'no_review') noReviewCount += 1;

      const reasons = c.mismatch_reasons ?? [];
      for (const r of reasons) mismatchCounts[r] = (mismatchCounts[r] ?? 0) + 1;

      const reviewFileUrl = c.review?.file_url ?? null;
      if (reviewFileUrl) reviewFileUrlPresentCount += 1;

      const externalLink = milestoneDeliverableLinkByKey.get(`${c.key.project_code}:${c.key.milestone_number}`) ?? null;
      if (externalLink) externalDeliverableLinkPresentCount += 1;
    }

    const safeCandidates = candidates.slice(0, limit).map((c) => ({
      key: c.key,
      match_quality: c.match_quality,
      mismatch_reasons: c.mismatch_reasons ?? null,
      deep_ops: {
        deliverable_id: c.deep_ops.deliverable_id,
        review_id: c.deep_ops.review_id ?? null,
      },
      deliverable: {
        status: c.deliverable.status ?? null,
        project_title: c.deliverable.project_title ?? null,
        requested_amount: c.deliverable.requested_amount ?? null,
        remaining_amount: c.deliverable.remaining_amount ?? null,
        milestone_price: c.deliverable.milestone_price ?? null,
        description: c.deliverable.description ?? null,
        ticket: c.deliverable.ticket ?? null,
        created_at: c.deliverable.created_at ?? null,
      },
      links: {
        external_deliverable_link: milestoneDeliverableLinkByKey.get(`${c.key.project_code}:${c.key.milestone_number}`) ?? null,
      },
      review: c.review
        ? {
            review_id: c.review.review_id,
            review_status: c.review.review_status ?? null,
            added_date: c.review.added_date ?? null,
            audited: Boolean(c.review.audit_date || c.review.audit_feedback),
            audit_date: c.review.audit_date ?? null,
            audit_feedback: c.review.audit_feedback ?? null,
            file_url: c.review.file_url ?? null,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      meta: {
        mode: client.mode,
        note:
          'Exploratory admin-only preview. Not authoritative report-generation business logic. Deliverables and reviews are fetched independently and then heuristically matched.',
        filters: {
          project_code: projectCode ?? null,
          deliverable_status: deliverableStatus ?? null,
          review_status: reviewStatus ?? null,
        },
        limit,
        offset,
        deliverables: { items_count: deliverablesRes.items.length, total: deliverablesRes.total },
        reviews: { items_count: reviewsRes.items.length, total: reviewsRes.total },
        externalMilestoneFeed: includeExternalMilestoneFeed
          ? {
              note: 'Supplemental reconciliation context only. Not used for report-candidate selection.',
              items_count: milestoneFeedRes?.items.length ?? 0,
              total: milestoneFeedRes?.total ?? 0,
              start_date: startDate,
              end_date: endDate,
            }
          : null,
      },
      data: {
        summary: {
          total_candidates: candidates.length,
          match_quality: {
            strict_match: strictMatchCount,
            deliverable_id_only: deliverableIdOnlyCount,
            no_review: noReviewCount,
          },
          mismatches: mismatchCounts,
          links: {
            review_file_url_present: reviewFileUrlPresentCount,
            external_deliverable_link_present: externalDeliverableLinkPresentCount,
            external_feed_items_with_deliverable_link: milestoneDeliverableLinkByKey.size,
          },
        },
        candidates: safeCandidates,
      },
    });
  } catch (err: any) {
    const safe = categorizeError(err);
    const status = safe.category === 'missing_api_key' ? 500 : safe.status ?? 500;
    return NextResponse.json({ success: false, error: safe }, { status });
  }
}
