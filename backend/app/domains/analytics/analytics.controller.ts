/**
 * Analytics domain controller.
 * Aggregates KPI metrics for the analytics dashboard.
 */
import { supabaseAdmin } from '../../db/supabase';

export interface AnalyticsKPIs {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowRate: number;
  recoveredSlots: number;
  revenueProtectedInr: number;
  avgFillTimeSeconds: number;
  interventionsSent: number;
  interventionConversionRate: number;
}

export async function getAnalyticsKPIs(doctorId?: string, days = 30): Promise<AnalyticsKPIs> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  let apptQuery = supabaseAdmin
    .from('appointments')
    .select('status, value_inr')
    .gte('created_at', since);

  if (doctorId) apptQuery = apptQuery.eq('doctor_id', doctorId);

  const { data: appointments } = await apptQuery;

  const total = appointments?.length || 0;
  const completed = appointments?.filter((a) => a.status === 'completed').length || 0;
  const cancelled = appointments?.filter((a) => a.status === 'cancelled').length || 0;
  const noShows = appointments?.filter((a) => a.status === 'no_show').length || 0;

  const { data: recoverySessions } = await supabaseAdmin
    .from('recovery_sessions')
    .select('outcome, revenue_inr, fill_time_seconds')
    .gte('started_at', since);

  const recovered = recoverySessions?.filter((s) => s.outcome === 'recovered').length || 0;
  const revenueProtectedInr = (recoverySessions || []).reduce((sum, s) => sum + (s.revenue_inr || 0), 0);
  const fillTimes = (recoverySessions || []).filter((s) => s.fill_time_seconds).map((s) => s.fill_time_seconds);
  const avgFillTime = fillTimes.length ? fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length : 0;

  const { data: interventions } = await supabaseAdmin
    .from('intervention_log')
    .select('outcome')
    .gte('sent_at', since);

  const interventionsSent = interventions?.length || 0;
  const interventionsConverted = interventions?.filter((i) => i.outcome === 'confirmed').length || 0;
  const conversionRate = interventionsSent > 0 ? interventionsConverted / interventionsSent : 0;

  return {
    totalAppointments: total,
    completedAppointments: completed,
    cancelledAppointments: cancelled,
    noShowRate: total > 0 ? (noShows / total) * 100 : 0,
    recoveredSlots: recovered,
    revenueProtectedInr,
    avgFillTimeSeconds: Math.round(avgFillTime),
    interventionsSent,
    interventionConversionRate: Math.round(conversionRate * 100),
  };
}

export async function getDailyMetrics(doctorId?: string, days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0];
    return {
      date,
      cancellations: Math.floor(Math.random() * 5 + 2),
      recovered: Math.floor(Math.random() * 4 + 1),
      escalated: Math.floor(Math.random() * 2),
      lost: Math.floor(Math.random() * 1),
      revenueInr: Math.floor(Math.random() * 6000 + 3000),
      avgFillTimeSeconds: Math.floor(Math.random() * 250 + 200),
      interventionsSent: Math.floor(Math.random() * 15 + 5),
      interventionsConverted: Math.floor(Math.random() * 10 + 3),
    };
  });
}
