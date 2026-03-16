import { createDeepOpsClient } from '../lib/deepOps/client';
import {
  buildPortalReportCandidates,
  mapDeepOpsDeliverableToPortalDeliverableSummary,
  mapDeepOpsReviewToPortalReviewSummary,
  mapDeepOpsUpdatedMilestoneToPortalMilestoneFeedItem,
} from '../lib/deepOps/mappers';

function firstItemKeys(list: Array<Record<string, unknown>>): string[] {
  const first = list[0];
  if (!first) return [];
  return Object.keys(first).sort();
}

async function main() {
  const client = createDeepOpsClient({ mode: 'mock' });

  const deliverablesRes = await client.getDeliverables({ limit: 1, offset: 0 });
  const reviewsRes = await client.getReviews({ limit: 1, offset: 0 });
  const externalUpdatesRes = await client.getUpdatedMilestones({ start_date: '2100-01-01', end_date: '2100-01-02', source: 'external' });

  const deliverables = deliverablesRes.items.map(mapDeepOpsDeliverableToPortalDeliverableSummary);
  const reviews = reviewsRes.items.map(mapDeepOpsReviewToPortalReviewSummary);
  const milestoneFeed = externalUpdatesRes.items.map(mapDeepOpsUpdatedMilestoneToPortalMilestoneFeedItem);

  const candidates = buildPortalReportCandidates({ deliverables: deliverablesRes.items, reviews: reviewsRes.items });

  const out = {
    mode: client.mode,
    deliverables: {
      count: deliverables.length,
      first_keys: firstItemKeys(deliverables as any),
    },
    reviews: {
      count: reviews.length,
      first_keys: firstItemKeys(reviews as any),
    },
    milestoneFeedExternal: {
      count: milestoneFeed.length,
      first_keys: firstItemKeys(milestoneFeed as any),
    },
    reportCandidates: {
      count: candidates.length,
      sample: candidates[0]
        ? {
            key: candidates[0].key,
            deep_ops: candidates[0].deep_ops,
            has_review: Boolean(candidates[0].review),
          }
        : null,
    },
  };

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${String((err as any)?.stack || err)}\n`);
  process.exitCode = 1;
});

