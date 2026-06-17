import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const patientId = url.searchParams.get('patientId') || 'P-1042';

    let query = supabaseAdmin
      .from('lab_orders')
      .select('*, doctors(name), patients(name)')
      .eq('patient_id', patientId);

    const { data: labs, error } = await query.order('ordered_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(labs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
