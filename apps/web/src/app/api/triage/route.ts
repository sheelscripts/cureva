/**
 * POST /api/triage — AI-powered symptom triage using direct LLM call.
 * The orchestrator path was broken (next_agent='' in defaults, supervisor
 * routed to 'escalation'). Replaced with direct generateStructuredOutput
 * call + keyword-based fallback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';
import { generateStructuredOutput } from '@cureva/backend';

const TRIAGE_PROMPT = (message: string) => `You are a clinical triage router for an Indian multi-specialty clinic. NEVER diagnose. Only route.

Patient said: "${message}"

Possible specialties: Cardiology, Dermatology, Orthopedics, General Medicine, Neurology, Psychiatry, Gynecology, Pediatrics, ENT, Ophthalmology.

Urgency levels: critical (chest pain, breathing difficulty, severe bleeding, stroke symptoms), high (severe persistent symptoms), medium (moderate symptoms), low (mild / informational).

Return JSON with: urgency, recommended_specialty, reasoning (1-2 sentences), red_flags (array).`;

// Keyword-based fallback router (used when LLM returns empty)
const KEYWORD_MAP: Record<string, string> = {
  chest: 'Cardiology', heart: 'Cardiology', palpitation: 'Cardiology', bp: 'Cardiology', 'blood pressure': 'Cardiology',
  skin: 'Dermatology', rash: 'Dermatology', acne: 'Dermatology', eczema: 'Dermatology', itch: 'Dermatology',
  knee: 'Orthopedics', joint: 'Orthopedics', bone: 'Orthopedics', fracture: 'Orthopedics', sprain: 'Orthopedics',
  head: 'Neurology', migraine: 'Neurology', nerve: 'Neurology', seizure: 'Neurology', dizzy: 'Neurology',
  depression: 'Psychiatry', anxiety: 'Psychiatry', sleep: 'Psychiatry', mental: 'Psychiatry', stress: 'Psychiatry',
  pregnancy: 'Gynecology', period: 'Gynecology', menstrual: 'Gynecology',
  child: 'Pediatrics', baby: 'Pediatrics', infant: 'Pediatrics',
  ear: 'ENT', throat: 'ENT', nose: 'ENT', sinus: 'ENT',
  eye: 'Ophthalmology', vision: 'Ophthalmology',
};

function keywordFallback(message: string): { specialty: string; urgency: string } {
  const lower = message.toLowerCase();
  let specialty = 'General Medicine';
  let urgency = 'medium';
  for (const [kw, spec] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(kw)) { specialty = spec; break; }
  }
  if (lower.includes('chest pain') || lower.includes("can't breathe") || lower.includes('shortness of breath')) {
    urgency = 'critical';
  } else if (lower.includes('severe') || lower.includes('high fever') || lower.includes('unconscious')) {
    urgency = 'high';
  } else if (lower.includes('mild') || lower.includes('slight')) {
    urgency = 'low';
  }
  return { specialty, urgency };
}

export async function POST(req: NextRequest) {
  try {
    const { message, patientId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    let activePatientId = patientId;
    if (!activePatientId) {
      const { data: patient } = await supabaseAdmin.from('patients').select('id').limit(1).single();
      activePatientId = patient?.id;
    }

    // Direct LLM call — bypass broken orchestrator
    let recommendedSpecialty = '';
    let urgency = 'medium';
    let reasoning = '';
    let redFlags: string[] = [];

    try {
      const result = await generateStructuredOutput<{
        urgency: string;
        recommended_specialty: string;
        reasoning: string;
        red_flags: string[];
      }>(
        TRIAGE_PROMPT(message),
        {
          type: 'OBJECT',
          properties: {
            urgency: { type: 'STRING', enum: ['low', 'medium', 'high', 'critical'] },
            recommended_specialty: { type: 'STRING' },
            reasoning: { type: 'STRING' },
            red_flags: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['urgency', 'recommended_specialty', 'reasoning'],
        },
        'You are a clinical triage router.'
      );

      if (result) {
        recommendedSpecialty = result.recommended_specialty || '';
        urgency = result.urgency || 'medium';
        reasoning = result.reasoning || '';
        redFlags = result.red_flags || [];
      }
    } catch (llmErr) {
      console.warn('[triage] LLM call failed, using keyword fallback:', llmErr);
    }

    // Keyword fallback if LLM returned empty specialty
    if (!recommendedSpecialty) {
      const fb = keywordFallback(message);
      recommendedSpecialty = fb.specialty;
      urgency = fb.urgency;
      reasoning = `Keyword-matched to ${recommendedSpecialty}.`;
    }

    const specialty = recommendedSpecialty;

    const { data: slots } = await supabaseAdmin
      .from('slots')
      .select('*, doctors(name, specialty, consultation_fee_inr)')
      .eq('status', 'available')
      .eq('doctors.specialty', specialty)
      .limit(2);

    const formattedActions = (slots || []).map((slot: any) => {
      const startTime = new Date(slot.start_time);
      return {
        label: `Book ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${startTime.toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : 'Tomorrow'}`,
        slotId: slot.id,
        doctorName: slot.doctors?.name || 'Dr. Sharma',
        time: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        specialty: slot.doctors?.specialty || specialty,
        cost: slot.doctors?.consultation_fee_inr || 1500,
      };
    });

    const content =
      reasoning ||
      `Based on your symptoms, we recommend consulting a specialist in ${specialty}. We have open slots available today and tomorrow.`;

    return NextResponse.json({
      content: `${content}\n\nUrgency Level: ${urgency.toUpperCase()}\nRecommended: ${specialty}`,
      actions: formattedActions,
      urgency,
      recommended_specialty: specialty,
      red_flags: redFlags,
    });
  } catch (error: any) {
    console.error('[Triage API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
