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
    const incoming = await request.formData();
    const confirm = String(incoming.get('confirm') ?? '');
    if (confirm !== 'UPLOAD') return NextResponse.json({ success: false, message: 'Confirmation required' }, { status: 400 });

    const fileFieldName = String(incoming.get('file_field_name') ?? 'file').trim() || 'file';
    const uploadedFile = incoming.get('file');
    if (!(uploadedFile instanceof File)) return NextResponse.json({ success: false, message: 'File is required' }, { status: 400 });

    const out = new FormData();
    out.set(fileFieldName, uploadedFile, uploadedFile.name);

    for (const [key, value] of incoming.entries()) {
      if (key === 'confirm') continue;
      if (key === 'file') continue;
      if (key === 'file_field_name') continue;
      if (value === undefined || value === null) continue;
      if (value instanceof File) continue;
      const s = String(value).trim();
      if (!s) continue;
      out.set(key, s);
    }

    const client = createDeepOpsWriteClient();
    const result = await client.uploadReview(out);

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

