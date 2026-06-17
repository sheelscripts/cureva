/**
 * GET /api/admin/revenue — revenue metrics from appointments, lab_orders, prescriptions
 * Falls back to revenueMetrics mock if DB query returns empty.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';
import { revenueMetrics } from '@/mock/analytics';

export async function GET(_req: NextRequest) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch appointments
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('scheduled_at, status, amount_inr')
      .gte('scheduled_at', thirtyDaysAgo.toISOString())
      .limit(10000);

    // Fetch lab orders
    const { data: labOrders } = await supabaseAdmin
      .from('lab_orders')
      .select('ordered_at, status, amount_inr')
      .gte('ordered_at', thirtyDaysAgo.toISOString())
      .limit(5000);

    // Fetch prescriptions (amount field may not exist, default 0)
    const { data: prescriptions } = await supabaseAdmin
      .from('prescriptions')
      .select('created_at, amount_inr')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(5000);

    if (
      (!appointments || appointments.length === 0) &&
      (!labOrders || labOrders.length === 0) &&
      (!prescriptions || prescriptions.length === 0)
    ) {
      return NextResponse.json(revenueMetrics);
    }

    // Compute today's numbers
    const todayAppts = (appointments || []).filter(a => new Date(a.scheduled_at) >= todayStart);
    const todayCompleted = todayAppts.filter(a => a.status === 'completed');
    const todayTotal = todayAppts.length || 1;
    const todayRevenue = todayCompleted.reduce((s, a) => s + (a.amount_inr || 0), 0);

    // Compute this-month numbers
    const monthAppts = (appointments || []).filter(a => new Date(a.scheduled_at) >= monthStart);
    const monthCompleted = monthAppts.filter(a => a.status === 'completed');
    const monthCancelled = monthAppts.filter(a => a.status === 'cancelled');
    const monthNoShow = monthAppts.filter(a => a.status === 'no_show');
    const monthTotal = monthAppts.length || 1;
    const monthRevenue = monthCompleted.reduce((s, a) => s + (a.amount_inr || 0), 0);
    const labRevenue = (labOrders || []).filter(o => o.status === 'completed').reduce((s, o) => s + (o.amount_inr || 0), 0);
    const rxRevenue = (prescriptions || []).reduce((s, p) => s + (p.amount_inr || 0), 0);

    // Build daily30Days
    const dailyMap: Record<string, { revenue: number; completed: number; total: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { revenue: 0, completed: 0, total: 0 };
    }
    for (const a of monthAppts) {
      const key = new Date(a.scheduled_at).toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].total++;
        if (a.status === 'completed') {
          dailyMap[key].completed++;
          dailyMap[key].revenue += a.amount_inr || 0;
        }
      }
    }
    const daily30Days = Object.entries(dailyMap).map(([date, agg]) => ({
      date,
      revenueInr: agg.revenue,
      appointmentsCompleted: agg.completed,
      utilizationRate: agg.total > 0 ? Math.round((agg.completed / agg.total) * 100) / 100 : 0,
    }));

    return NextResponse.json({
      today: {
        totalInr: todayRevenue + labRevenue + rxRevenue,
        appointmentsCompleted: todayCompleted.length,
        utilizationRate: Math.round((todayCompleted.length / todayTotal) * 100) / 100,
        avgAppointmentValueInr: todayCompleted.length > 0 ? Math.round(todayRevenue / todayCompleted.length) : 0,
      },
      thisMonth: {
        totalInr: monthRevenue + labRevenue + rxRevenue,
        revenueProtectedInr: 0,
        noShowLossInr: monthNoShow.reduce((s, a) => s + (a.amount_inr || 0), 0),
        appointmentsCompleted: monthCompleted.length,
        appointmentsCancelled: monthCancelled.length,
        appointmentsNoShow: monthNoShow.length,
        utilizationRate: Math.round((monthCompleted.length / monthTotal) * 100) / 100,
        protectionRate: 0,
      },
      daily30Days,
    });
  } catch (err: unknown) {
    return NextResponse.json(revenueMetrics);
  }
}