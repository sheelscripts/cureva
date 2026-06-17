/**
 * /api/scribe/chunk — processes a live audio chunk from the AI Scribe.
 *
 * Previous implementation called runOrchestrator() which was broken
 * (next_agent='' defaults, supervisor routing to 'escalation'). Replaced
 * with direct STT (ElevenLabs) + LLM (generateStructuredOutput) calls.
 *
 * Flow:
 *   audio_base64  →  ElevenLabs STT  →  transcript text
 *   transcript + existingSoap  →  LLM  →  SOAP diff + alerts
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  transcribeAndTranslateAudio,
  generateStructuredOutput,
  ElevenLabsError,
} from '@cureva/backend';

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, audio, existingSoap, existingTranscript } = await req.json();

    if (!appointmentId || !audio) {
      return NextResponse.json({ error: 'Missing appointmentId or audio data' }, { status: 400 });
    }

    // ── Step 1: STT ─────────────────────────────────────────────────
    let transcriptChunk = '';
    try {
      transcriptChunk = await transcribeAndTranslateAudio(
        audio,
        'audio/webm',
        'Medical consultation in India. Speaker is a doctor or patient. Keep medical terms accurate.'
      );
    } catch (sttErr) {
      if (sttErr instanceof ElevenLabsError) {
        console.warn('[scribe/chunk] STT failed:', sttErr.message);
        // Fall back: return empty chunk rather than failing the whole request
        transcriptChunk = '';
      } else {
        throw sttErr;
      }
    }

    const fullTranscript = (existingTranscript || '') + (transcriptChunk ? ' ' + transcriptChunk : '');

    // ── Step 2: LLM SOAP extraction (skip if no new transcript) ───
    let soapNote = existingSoap || {
      subjective: '',
      objective: { bp: '', weight: '', heartRate: '', details: '' },
      assessment: '',
      plan: '',
    };
    const alerts: Array<{ message: string; severity: string; source: string }> = [];

    if (transcriptChunk.trim()) {
      try {
        const soapSchema = {
          type: 'OBJECT',
          properties: {
            subjective: {
              type: 'OBJECT',
              properties: {
                summary: { type: 'STRING', description: '1-2 sentence summary of patient complaints' },
                symptoms: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Array of symptom keywords detected' },
              },
            },
            objective: {
              type: 'OBJECT',
              properties: {
                bp: { type: 'STRING', description: 'Blood pressure reading if mentioned (e.g. 138/88)' },
                weight: { type: 'STRING', description: 'Weight if mentioned (e.g. 67 kg)' },
                heartRate: { type: 'STRING', description: 'Heart rate if mentioned (e.g. 74 bpm)' },
                details: { type: 'STRING', description: 'Key examination findings' },
              },
            },
            assessment: { type: 'STRING', description: 'Clinical assessment / diagnosis based on transcript' },
            plan: { type: 'STRING', description: 'Diagnostic and treatment plan' },
          },
          required: ['subjective', 'objective', 'assessment', 'plan'],
        };

        const soapPrompt = `You are an AI medical scribe extracting structured clinical SOAP notes from a consultation transcript.

Previous SOAP draft (if any):
${existingSoap ? JSON.stringify(existingSoap, null, 2) : 'None — this is the first chunk.'}

New transcript chunk from the consultation:
"${transcriptChunk}"

Extract or update the SOAP fields based ONLY on the new transcript chunk.
Keep previously captured values unless explicitly contradicted by the new transcript.
Return the full SOAP structure (all four sections) with the latest information.`;

        const soapResult = await generateStructuredOutput<{
          subjective: { summary: string; symptoms: string[] };
          objective: { bp: string; weight: string; heartRate: string; details: string };
          assessment: string;
          plan: string;
        }>(
          soapPrompt,
          soapSchema,
          'You are an expert medical scribe. Extract accurate SOAP notes from consultation transcripts. Never fabricate information not present in the transcript.'
        );

        if (soapResult) {
          // Merge: prefer new values, keep old ones if new are empty
          const prev = existingSoap || soapNote;
          soapNote = {
            subjective: soapResult.subjective?.summary
              ? `${prev.subjective || ''} ${soapResult.subjective.summary}`.trim()
              : prev.subjective || '',
            subjectiveSymptoms: soapResult.subjective?.symptoms || [],
            objective: {
              bp: soapResult.objective?.bp || prev.objective?.bp || '',
              weight: soapResult.objective?.weight || prev.objective?.weight || '',
              heartRate: soapResult.objective?.heartRate || prev.objective?.heartRate || '',
              details: soapResult.objective?.details || prev.objective?.details || '',
            },
            assessment: soapResult.assessment || prev.assessment || '',
            plan: soapResult.plan || prev.plan || '',
          };
        }
      } catch (llmErr) {
        console.warn('[scribe/chunk] LLM SOAP extraction failed:', llmErr);
        // Keep existing soap, continue with what we have
      }

      // ── Step 3: Alert detection ───────────────────────────────────
      const alertKeywords = [
        { kw: /cardiac|heart attack|myocardial infarction/i, sev: 'danger', msg: 'Cardiac symptoms mentioned — consider urgent cardiology evaluation.' },
        { kw: /chest pain/i, sev: 'danger', msg: 'Chest pain mentioned — rule out ACS.' },
        { kw: /suicidal|suicide|self.?harm/i, sev: 'danger', msg: 'Suicidal ideation flagged — mental health crisis protocol.' },
        { kw: /shortness of breath|dyspnea|can\'t breathe/i, sev: 'warning', msg: 'Respiratory distress mentioned — assess oxygen saturation.' },
        { kw: /stroke|facial droop|slurred speech/i, sev: 'danger', msg: 'Stroke symptoms mentioned — activate stroke protocol.' },
        { kw: /high fever|seizure/i, sev: 'warning', msg: 'High fever or seizure mentioned — urgent evaluation needed.' },
        { kw: /hba1c|diabetes|blood sugar/i, sev: 'info', msg: 'Diabetes metrics discussed — ensure appropriate follow-up scheduled.' },
      ];

      const transcriptLower = transcriptChunk.toLowerCase();
      for (const { kw, sev, msg } of alertKeywords) {
        if (kw.test(transcriptLower)) {
          alerts.push({ message: msg, severity: sev, source: 'scribe_alert' });
        }
      }
    }

    return NextResponse.json({
      transcriptChunk: transcriptChunk.trim(),
      fullTranscript: fullTranscript.trim(),
      soap: soapNote,
      alerts,
    });
  } catch (error: any) {
    console.error('[POST /api/scribe/chunk] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process audio chunk' }, { status: 500 });
  }
}