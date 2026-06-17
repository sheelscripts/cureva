/**
 * POST /api/ask — Pure Q&A endpoint for the PatientPortal "Ask AI Assistant" tab.
 *
 * Pipeline:
 *   1. Embed the user's question (OpenRouter text-embedding-3-small, 768-dim)
 *   2. Retrieve top-k relevant chunks from `documents` table via match_documents RPC
 *   3. Build a context-grounded prompt with the retrieved docs
 *   4. Call the LLM (Vercel AI Gateway, multi-fallback chain) for a grounded answer
 *
 * No auto-booking, no specialty recommendation — pure Q&A grounded in patient records.
 */
import { generateStructuredOutput, supabaseAdmin } from '@cureva/backend';
import { embedWithOpenRouter } from '@cureva/backend';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message, patientContext, patientId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    // ── 1. RAG retrieval ────────────────────────────────────────
    let ragContext = '';
    let ragSources: string[] = [];
    try {
      const queryEmbedding = await embedWithOpenRouter(message);
      const { data: ragResults, error: ragErr } = await supabaseAdmin.rpc('match_documents' as any, {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 5,
        // Pass null to search ALL categories. The seed ingests with category 'lab_report'.
        category_filter: null,
      });

      if (!ragErr && ragResults && ragResults.length > 0) {
        ragContext = ragResults
          .map((r: any, i: number) => `[${i + 1}] ${r.text || r.content || ''}`)
          .join('\n\n');
        // The RPC returns flat fields: id, text, source, category, similarity.
        // Use 'source' (e.g. "lab_report:hba1c") as the human-readable source label.
        ragSources = ragResults.map((r: any) => r.source || 'medical record');
      }
    } catch (e: any) {
      console.warn('[ask] RAG retrieval failed (continuing without context):', e.message);
    }

    // ── 2. Build context-grounded prompt ────────────────────────
    const hasContext = ragContext.length > 0;
    const prompt = `You are CureV's AI health assistant. Answer the patient's question based on their medical record context.

${hasContext ? `Relevant medical records (RAG-retrieved):\n${ragContext}\n` : ''}${patientContext ? `Patient context: ${patientContext}\n` : ''}Patient question: "${message}"

${hasContext ? 'Use the retrieved records above to ground your answer in the patient\'s actual data. ' : ''}Provide a clear, helpful answer in 2-3 sentences. If the question requires a doctor, suggest booking a consultation but DO NOT auto-book. Always add: "This is informational and does not replace medical advice from your doctor."`;

    // ── 3. LLM call ─────────────────────────────────────────────
    const result = await generateStructuredOutput<{
      answer: string;
      suggestBooking: boolean;
      bookingReason: string;
    }>(
      prompt,
      {
        type: 'OBJECT',
        properties: {
          answer: { type: 'STRING', description: '2-3 sentence grounded answer' },
          suggestBooking: { type: 'BOOLEAN', description: 'true if doctor visit recommended' },
          bookingReason: { type: 'STRING', description: 'if suggestBooking, why' },
        },
        required: ['answer', 'suggestBooking'],
      },
      'You are a helpful, accurate health Q&A assistant. Ground answers in the retrieved records when available. Never fabricate lab values.'
    );

    return NextResponse.json({
      ...(result || {
        answer: 'I am having trouble processing your question. Please try again or book a consultation.',
        suggestBooking: true,
        bookingReason: 'Technical issue',
      }),
      sources: ragSources,
      ragUsed: hasContext,
    });
  } catch (e: any) {
    console.error('[ask] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
