import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const patientId = url.searchParams.get('patientId') || 'P-1042';
    const doctorId = url.searchParams.get('doctorId');

    let query = supabaseAdmin
      .from('appointments')
      .select('*, doctors(name, specialty), patients(name)')
      .eq('patient_id', patientId);

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    const { data: appointments, error } = await query.order('slot_time', { ascending: false });

    if (error) throw error;

    return NextResponse.json(appointments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { slotId, doctorName, date, time, specialty, cost, patientId } = await req.json();

    // Find default patient if none passed
    let activePatientId = patientId;
    if (!activePatientId) {
      const { data: firstPat } = await supabaseAdmin.from('patients').select('id').limit(1).single();
      activePatientId = firstPat?.id;
    }

    if (!slotId || !activePatientId) {
      return NextResponse.json({ error: 'Missing slotId or patientId' }, { status: 400 });
    }

    // Book slot transaction
    const { data: slot } = await supabaseAdmin.from('slots').select('*').eq('id', slotId).single();
    if (!slot || slot.status !== 'available') {
      return NextResponse.json({ error: 'Slot not available' }, { status: 400 });
    }

    // 1. Create Appointment
    const apptId = `A-${Math.floor(1000 + Math.random() * 9000)}`;
    const slotTime = slot.start_time;

    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .insert({
        id: apptId,
        patient_id: activePatientId,
        doctor_id: slot.doctor_id,
        slot_id: slotId,
        slot_time: slotTime,
        status: 'confirmed',
        specialty: specialty || 'General Medicine',
        value_inr: cost || 1500,
        reason: 'Triage-assisted booking'
      })
      .select()
      .single();

    if (apptErr || !appt) {
      throw new Error(`Failed to create appointment: ${apptErr?.message}`);
    }

    // 2. Mark slot booked
    await supabaseAdmin
      .from('slots')
      .update({ status: 'booked', appointment_id: apptId })
      .eq('id', slotId);

    return NextResponse.json({
      success: true,
      appointment: {
        id: apptId,
        doctorName: doctorName || 'Doctor',
        specialty: specialty || 'General Medicine',
        date: date || new Date(slotTime).toLocaleDateString(),
        time: time || new Date(slotTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'upcoming',
        location: 'City Clinic, Sector 12',
        valueInr: cost || 1500,
        reason: 'Triage-assisted booking'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
