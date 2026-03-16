import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtAndGetUser } from '@/lib/auth/admin-auth';
import { createDeepOpsClient } from '@/lib/deepOps/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, ctx: { params: Promise<{ reviewId: string }> }) {
  const user = await verifyJwtAndGetUser(request);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  const { reviewId } = await ctx.params;
  const id = Number(reviewId);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ success: false, message: 'Invalid review id' }, { status: 400 });

  try {
    const client = createDeepOpsClient({ mode: 'live' });
    const review = await client.getReviewById(id);
    return NextResponse.json({ success: true, data: review }, { status: 200 });
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 500;
    return NextResponse.json({ success: false, message: String(err?.message || err) }, { status });
  }
}

