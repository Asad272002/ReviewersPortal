import { createDeepOpsClient } from '../lib/deepOps/client';

async function main() {
  const client = createDeepOpsClient({ mode: 'mock' });

  const profile = await client.getProfile();
  const deliverables = await client.getDeliverables({ limit: 1, offset: 0 });
  const deliverableById = await client.getDeliverableById(deliverables.items[0]?.deliverable_id ?? 0);
  const reviews = await client.getReviews({ limit: 1, offset: 0 });
  const reviewById = await client.getReviewById(reviews.items[0]?.review_id ?? 0);
  const updatedInternal = await client.getUpdatedMilestones({ start_date: '2100-01-01', end_date: '2100-01-02', source: 'internal' });
  const updatedExternal = await client.getUpdatedMilestones({ start_date: '2100-01-01', end_date: '2100-01-02', source: 'external' });

  const output = {
    mode: client.mode,
    profile,
    deliverables,
    deliverableById,
    reviews,
    reviewById,
    updatedInternal,
    updatedExternal,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exitCode = 1;
});

