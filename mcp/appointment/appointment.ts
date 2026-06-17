import { supabaseAdmin } from '@backend/app/db/supabase';
import { callMcpTool } from '../index';

export async function book_appointment(agentRunId: string, patient_id: string, slot_id: string, reason: string) {
  return callMcpTool(agentRunId, 'book_appointment', 'appointment-mcp', async () => {
    const { data: slot } = await supabaseAdmin.from('slots').select('*').eq('id', slot_id).single();
    if (!slot || slot.status !== 'available') throw new Error('Slot unavailable');

    const apptId = `A-${Math.floor(1000 + Math.random() * 9000)}`;
    await supabaseAdmin.from('appointments').insert({
      id: apptId,
      patient_id,
      doctor_id: slot.doctor_id,
      slot_id,
      slot_time: slot.start_time,
      status: 'confirmed',
      reason
    });

    await supabaseAdmin.from('slots').update({ status: 'booked', appointment_id: apptId }).eq('id', slot_id);
    return { success: true, appointment_id: apptId, slot_time: slot.start_time };
  }, { patient_id, slot_id, reason });
}

export async function cancel_appointment(agentRunId: string, appointment_id: string, reason: string) {
  return callMcpTool(agentRunId, 'cancel_appointment', 'appointment-mcp', async () => {
    const { data: appt } = await supabaseAdmin.from('appointments').select('slot_id').eq('id', appointment_id).single();
    if (!appt) throw new Error('Appointment not found');

    await supabaseAdmin.from('appointments').update({ status: 'cancelled', cancellation_reason: reason }).eq('id', appointment_id);
    if (appt.slot_id) {
      await supabaseAdmin.from('slots').update({ status: 'available', appointment_id: null }).eq('id', appt.slot_id);
    }
    return { success: true };
  }, { appointment_id, reason });
}
