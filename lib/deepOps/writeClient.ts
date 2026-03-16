export type DeepOpsWriteMode = 'live';

export type DeepOpsWriteClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  requireApiKey?: boolean;
};

export type DeepOpsWriteResult = {
  ok: boolean;
  status: number;
  response: unknown;
  response_keys: string[];
};

function resolveBaseUrl(baseUrl?: string) {
  const fromEnv =
    (process.env.DEEP_OPS_BASE_URL || process.env.DEEP_OPS_API_BASE_URL || process.env.NEXT_PUBLIC_DEEP_OPS_BASE_URL || '').trim() || undefined;
  const url = (baseUrl ?? fromEnv ?? 'https://api.deep-operations.ai').replace(/\/$/, '');
  return url;
}

function resolveApiKey(apiKey?: string) {
  return (apiKey ?? process.env.DEEP_OPS_API_KEY ?? '').trim();
}

function pickKeys(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).sort();
}

async function safeParseJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function createDeepOpsWriteClient(options: DeepOpsWriteClientOptions = {}) {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const apiKey = resolveApiKey(options.apiKey);
  const timeoutMs = options.timeoutMs ?? 10_000;
  const requireApiKey = options.requireApiKey ?? true;

  if (requireApiKey && !apiKey) {
    throw new Error('Deep Ops write calls require an API key. Provide options.apiKey or set DEEP_OPS_API_KEY.');
  }

  const request = async (input: RequestInfo, init: RequestInit): Promise<DeepOpsWriteResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      const text = await res.text();
      const json = (await safeParseJson(text)) ?? text;
      return {
        ok: res.ok,
        status: res.status,
        response: json,
        response_keys: pickKeys(json),
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        const e = new Error(`Deep Ops request timed out after ${timeoutMs}ms`);
        (e as any).code = 'DEEP_OPS_TIMEOUT';
        throw e;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    mode: 'live' as const,
    async uploadReview(formData: FormData) {
      return request(`${baseUrl}/api/v1/reviews`, {
        method: 'POST',
        headers: {
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: formData,
      });
    },
    async auditReview(reviewId: number, payload: unknown) {
      return request(`${baseUrl}/api/v1/reviews/${encodeURIComponent(String(reviewId))}/audit`, {
        method: 'PATCH',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify(payload ?? {}),
      });
    },
  };
}

