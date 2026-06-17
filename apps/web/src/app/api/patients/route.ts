/**
 * GET /api/patients — fetch patient data
 * 
 * Query params:
 *   id — fetch a specific patient by ID
 *   (none) — default to Priya Mehta (canonical demo patient)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPatient, supabaseAdmin } from '@cureva/backend';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      const patient = await getPatient(id);
      return NextResponse.json(patient);
    }

    // Default: find Priya Mehta by name (the canonical demo patient)
    // Falls back to first patient if no Priya exists, then to error if DB empty.
    const { data: priya } = await supabaseAdmin
      .from('patients')
      .select('*')
      .ilike('name', 'Priya Mehta')
      .limit(1)
      .single();

    if (priya) return NextResponse.json(priya);

    // No Priya in DB — return first available patient
    const { data: firstPatient, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .limit(1)
      .single();

    if (error || !firstPatient) {
      return NextResponse.json({ error: error?.message || 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json(firstPatient);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
