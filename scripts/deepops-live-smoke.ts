import { createDeepOpsClient } from '../lib/deepOps/client';

type SmokeOk = {
  ok: true;
  name: string;
  meta: Record<string, unknown>;
};

type SmokeErr = {
  ok: false;
  name: string;
  error: {
    category: 'timeout' | 'unexpected_shape' | 'auth' | 'missing_api_key' | 'api_error' | 'unknown';
    message: string;
    status?: number;
    code?: string;
  };
};

function topLevelKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).sort();
}

function categorizeError(err: any): SmokeErr['error'] {
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

async function runCall<T>(name: string, fn: () => Promise<T>, summarize: (result: T) => Record<string, unknown>): Promise<SmokeOk | SmokeErr> {
  try {
    const result = await fn();
    return { ok: true, name, meta: summarize(result) };
  } catch (err: any) {
    return { ok: false, name, error: categorizeError(err) };
  }
}

async function main() {
  const client = createDeepOpsClient({ mode: 'live' });

  const results: Array<SmokeOk | SmokeErr> = [];

  results.push(await runCall('getProfile', () => client.getProfile(), (p) => ({
    keys: topLevelKeys(p),
    user_id: (p as any)?.user_id,
    roles_count: Array.isArray((p as any)?.roles) ? (p as any).roles.length : 0,
  })));

  results.push(await runCall('getDeliverables(limit=1,offset=0)', () => client.getDeliverables({ limit: 1, offset: 0 }), (r) => ({
    total: (r as any)?.total,
    items_count: Array.isArray((r as any)?.items) ? (r as any).items.length : 0,
    first_item_keys: Array.isArray((r as any)?.items) && (r as any).items[0] ? topLevelKeys((r as any).items[0]) : [],
  })));

  results.push(await runCall('getReviews(limit=1,offset=0)', () => client.getReviews({ limit: 1, offset: 0 }), (r) => ({
    total: (r as any)?.total,
    items_count: Array.isArray((r as any)?.items) ? (r as any).items.length : 0,
    first_item_keys: Array.isArray((r as any)?.items) && (r as any).items[0] ? topLevelKeys((r as any).items[0]) : [],
  })));

  results.push(await runCall('getUpdatedMilestones(external, 2026-03-01..2026-03-14)', () =>
    client.getUpdatedMilestones({ start_date: '2026-03-01', end_date: '2026-03-14', source: 'external' }),
    (r) => ({
      source: (r as any)?.source,
      total: (r as any)?.total,
      items_count: Array.isArray((r as any)?.items) ? (r as any).items.length : 0,
      first_item_keys: Array.isArray((r as any)?.items) && (r as any).items[0] ? topLevelKeys((r as any).items[0]) : [],
    }),
  ));

  process.stdout.write(`${JSON.stringify({ ok: results.every((r) => r.ok), results }, null, 2)}\n`);
  process.exitCode = results.some((r) => !r.ok) ? 1 : 0;
}

main().catch((err) => {
  const safe = categorizeError(err);
  process.stderr.write(`${JSON.stringify({ ok: false, fatal: safe }, null, 2)}\n`);
  process.exitCode = 1;
});
