/**
 * GET /api/slotsaver — SlotSaver dashboard data
 * Delegates to the @cureva/backend domain controller.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSlotSaverDashboard } from '@cureva/backend';

export async function GET(_req: NextRequest) {
  try {
    const data = await getSlotSaverDashboard();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[GET /api/slotsaver] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
