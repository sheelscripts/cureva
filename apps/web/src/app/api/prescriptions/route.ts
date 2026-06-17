/**
 * GET  /api/prescriptions  — list prescriptions
 * POST /api/prescriptions  — generate AI prescription suggestions via orchestrator
 */
import { NextRequest, NextResponse } from 'next/server';
import { listPrescriptions, savePrescription, supabaseAdmin } from '@cureva/backend';
import { runOrchestrator } from '../../../lib/agents/orchestrator';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const patientId = url.searchParams.get('patientId') || 'P-1042';
    const doctorId = url.searchParams.get('doctorId') || undefined;

    const prescriptions = await listPrescriptions({ patientId, doctorId });
    return NextResponse.json(prescriptions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, patientId, diagnosis } = await req.json();

    if (!appointmentId || !patientId || !diagnosis) {
      return NextResponse.json(
        { error: 'Missing appointmentId, patientId, or diagnosis' },
        { status: 400 }
      );
    }

    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('*, doctors(*)')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      throw new Error(`Appointment not found: ${apptErr?.message}`);
    }

    // Run LangGraph prescription agent
    const finalState = await runOrchestrator({
      session_id: `rx-${appointmentId}`,
      event_type: 'prescription_request',
      appointment_id: appointmentId,
      patient_id: patientId,
      doctor_id: appt.doctor_id,
      specialty: appt.specialty || appt.doctors?.specialty || 'General Medicine',
      diagnosis,
    });

    if (finalState.error) throw new Error(finalState.error);

    const prescription = await savePrescription({
      appointmentId,
      patientId,
      doctorId: appt.doctor_id,
      diagnosis,
      medicines: finalState.suggested_medicines || [],
      testsOrdered: finalState.tests_ordered || [],
      instructions: finalState.prescription_notes || '',
      followUpDays: finalState.follow_up_days || 7,
    });

    return NextResponse.json({
      success: true,
      prescription,
      interactionAlerts: finalState.interaction_alerts || [],
      drugInteractions: finalState.drug_interactions || [],
    });
  } catch (error: any) {
    console.error('[POST /api/prescriptions] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate prescription suggestions' },
      { status: 500 }
    );
  }
}
