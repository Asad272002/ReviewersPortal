import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtAndGetUser } from '@/lib/auth/admin-auth';
import { createDeepOpsWriteClient } from '@/lib/deepOps/writeClient';

export const runtime = 'nodejs';

function categorizeError(err: any) {
  const status = typeof err?.status === 'number' ? err.status : undefined;
  const code = typeof err?.code === 'string' ? err.code : undefined;
  const message = String(err?.message || err);
  if (code === 'DEEP_OPS_TIMEOUT') return { category: 'timeout', message, status, code };
  if (status === 401 || status === 403) return { category: 'auth', message, status, code };
  if (message.toLowerCase().includes('requires an api key')) return { category: 'missing_api_key', message, status, code };
  if (status) return { category: 'api_error', message, status, code };
  return { category: 'unknown', message, status, code };
}

export async function POST(request: NextRequest) {
  const user = await verifyJwtAndGetUser(request);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const confirm = String(body?.confirm ?? '');
    if (confirm !== 'AUDIT') return NextResponse.json({ success: false, message: 'Confirmation required' }, { status: 400 });

    const reviewId = Number(body?.review_id);
    if (!Number.isFinite(reviewId) || reviewId <= 0) return NextResponse.json({ success: false, message: 'review_id is required' }, { status: 400 });

    const payloadOverrideText = typeof body?.payload_override === 'string' ? body.payload_override.trim() : '';
    let payload: any;
    if (payloadOverrideText) {
      try {
        payload = JSON.parse(payloadOverrideText);
      } catch {
        return NextResponse.json({ success: false, message: 'payload_override must be valid JSON' }, { status: 400 });
      }
    } else {
      const auditStatus = String(body?.audit_status ?? '').trim();
      const auditFeedback = typeof body?.audit_feedback === 'string' ? body.audit_feedback : '';
      if (!auditStatus) return NextResponse.json({ success: false, message: 'audit_status is required' }, { status: 400 });
      payload = { audit_status: auditStatus, audit_feedback: auditFeedback };
    }

    const client = createDeepOpsWriteClient();
    const result = await client.auditReview(reviewId, payload);

    return NextResponse.json(
      {
        success: result.ok,
        deep_ops: {
          status: result.status,
          response_keys: result.response_keys,
        },
        response: result.ok ? result.response : undefined,
        error: result.ok ? undefined : result.response,
      },
      { status: result.ok ? 200 : result.status || 502 },
    );
  } catch (err: any) {
    const safe = categorizeError(err);
    const status = safe.category === 'missing_api_key' ? 500 : safe.status ?? 500;
    return NextResponse.json({ success: false, error: safe }, { status });
  }
}

