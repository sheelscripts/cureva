/**
 * /api/voice-call/turn
 *
 * Single-turn voice conversation endpoint. Browser posts a recorded
 * audio chunk (webm/wav/m4a); the route runs:
 *
 *   audio  →  ElevenLabs STT          (transcribeAndTranslateAudio)
 *   text   →  OpenRouter LLM          (chatCompletionWithFallback)
 *   text   →  ElevenLabs TTS          (synthesizeSpeechBase64)
 *
 * Returns:
 *   {
 *     user_transcript,    // what the user said (English)
 *     ai_text,            // what the AI replied
 *     ai_audio_base64,    // TTS audio for the AI reply (mp3)
 *     contentType,        // 'audio/mpeg'
 *     voiceId,            // ElevenLabs voice used
 *     model,              // which OpenRouter model answered
 *     fromFallback,       // true if fallback model was used
 *     history,            // updated conversation history (caller appends)
 *   }
 *
 * The route also accepts a `text` field as a fallback when the
 * browser can't capture audio (mic permission denied, no HTTPS, etc.)
 * — the STT step is skipped but the LLM and TTS still run.
 *
 * Free tier / demo behaviour:
 *   • ElevenLabs key missing → returns ai_audio_base64 = '' and a
 *     `ttsSkipped: true` flag so the browser can fall back to
 *     browser-native speechSynthesis.
 *   • OpenRouter key missing → 503 with a clear remediation message.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  transcribeAndTranslateAudio,
  synthesizeSpeechBase64,
  ElevenLabsError,
} from '@cureva/backend';
import {
  chatCompletionWithFallback,
  OpenRouterError,
  type ChatMessage,
} from '@cureva/backend';

export const runtime = 'nodejs'; // ElevenLabs + OpenRouter use Node fetch, not Edge.
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds — STT + LLM + TTS can take a moment on free tier.

interface TurnRequestBody {
  audio?: string; // base64 audio
  mimeType?: string; // e.g. 'audio/webm'
  text?: string; // manual text fallback
  history?: ChatMessage[]; // prior turns in this session
  /** Optional override for the AI persona — defaults to the triage voice. */
  systemPrompt?: string;
}

interface TurnResponseBody {
  user_transcript: string;
  ai_text: string;
  ai_audio_base64: string;
  contentType: string;
  voiceId: string;
  model: string;
  fromFallback: boolean;
  ttsSkipped: boolean;
  sttSkipped: boolean;
  history: ChatMessage[];
}

const DEFAULT_VOICE_PROMPT = `You are Dr. Aria, a calm and reassuring AI doctor on the CureV voice assistant. You are speaking to a patient who called in for a quick symptom check.

Rules:
- Keep every reply to 1–3 short sentences spoken aloud. Be conversational, not clinical.
- Ask exactly one focused follow-up question per turn (duration, severity, related symptoms, etc.).
- Do NOT diagnose. Do NOT prescribe medication. Stay within scope: gather information, then suggest the right specialty (cardiology, dermatology, general medicine, orthopedics, etc.) and urgency (low / medium / high) at the end.
- If the patient mentions red-flag symptoms (chest pain, sudden severe headache, difficulty breathing, stroke-like symptoms, severe bleeding, suicidal thoughts), drop the gentle tone and immediately tell them to call their local emergency number or go to the nearest ER.
- Always speak in English unless the patient is clearly speaking another language — then mirror their language.
- Never use markdown, bullet points, or lists. Plain spoken prose only.`;

/**
 * Decide whether the assistant should wrap up and recommend a
 * specialty. Heuristic: 3+ back-and-forth turns and the user has
 * described the main symptom → emit a JSON recommendation block.
 */
function buildWrapUpMessages(history: ChatMessage[]): ChatMessage[] {
  const wrapUp: ChatMessage = {
    role: 'system',
    content:
      'You have enough information. Respond in spoken prose. Then on the FINAL line, append a single JSON object of shape {"specialty": string, "urgency": "low"|"medium"|"high", "reasoning": string}. Example: "Based on what you have shared, I would recommend seeing a cardiologist soon. {\\"specialty\\":\\"cardiology\\",\\"urgency\\":\\"medium\\",\\"reasoning\\":\\"recurring chest discomfort on exertion\\"}"',
  };
  return [...history, wrapUp];
}

export async function POST(req: NextRequest) {
  let body: TurnRequestBody;
  try {
    body = (await req.json()) as TurnRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    audio,
    mimeType = 'audio/webm',
    text,
    history = [],
    systemPrompt,
  } = body;

  if (!audio && !text) {
    return NextResponse.json(
      { error: 'Provide either `audio` (base64) or `text`.' },
      { status: 400 }
    );
  }

  // ─── STT ────────────────────────────────────────────────────────
  let userTranscript = (text || '').trim();
  let sttSkipped = true;

  if (!userTranscript && audio) {
    try {
      userTranscript = await transcribeAndTranslateAudio(audio, mimeType);
      sttSkipped = false;
    } catch (err) {
      if (err instanceof ElevenLabsError) {
        return NextResponse.json(
          {
            error: 'Speech-to-text failed',
            detail: err.message,
            remediation:
              'Check ELEVENLABS_API_KEY in apps/web/.env.local, or send `text` instead of `audio`.',
          },
          { status: 502 }
        );
      }
      throw err;
    }
  }

  if (!userTranscript) {
    return NextResponse.json(
      {
        error: 'Could not transcribe audio and no `text` fallback was provided.',
        hint: 'Speak more clearly or send `text` instead of `audio`.',
      },
      { status: 400 }
    );
  }

  // ─── LLM ────────────────────────────────────────────────────────
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt || DEFAULT_VOICE_PROMPT },
    ...history,
    { role: 'user', content: userTranscript },
  ];

  let aiText = '';
  let model = '';
  let fromFallback = false;

  try {
    // Use the wrap-up nudge once we have 3+ turns of conversation.
    const useWrapUp = history.filter((m) => m.role === 'user').length >= 2;
    const llmMessages = useWrapUp ? buildWrapUpMessages(messages) : messages;

    const result = await chatCompletionWithFallback({
      messages: llmMessages,
      temperature: 0.6,
      maxTokens: 220,
    });
    aiText = result.text.trim();
    model = result.model;
    fromFallback = result.fromFallback;
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return NextResponse.json(
        {
          error: 'LLM call failed',
          detail: err.message,
          remediation:
            'Check OPENROUTER_API_KEY in apps/web/.env.local and confirm the model IDs are still free on https://openrouter.ai/models.',
        },
        { status: 502 }
      );
    }
    throw err;
  }

  if (!aiText) {
    return NextResponse.json(
      { error: 'LLM returned an empty response.' },
      { status: 502 }
    );
  }

  // ─── TTS ────────────────────────────────────────────────────────
  let audioBase64 = '';
  let contentType = '';
  let voiceId = '';
  let ttsSkipped = true;

  try {
    const tts = await synthesizeSpeechBase64(aiText);
    audioBase64 = tts.audioBase64;
    contentType = tts.contentType;
    voiceId = tts.voiceId;
    ttsSkipped = false;
  } catch (err) {
    if (err instanceof ElevenLabsError) {
      // TTS is optional — the caller can fall back to browser-native TTS.
      console.warn('[voice-call/turn] TTS unavailable, returning text-only:', err.message);
    } else {
      console.warn('[voice-call/turn] TTS unexpected error:', err);
    }
  }

  const responseBody: TurnResponseBody = {
    user_transcript: userTranscript,
    ai_text: aiText,
    ai_audio_base64: audioBase64,
    contentType,
    voiceId,
    model,
    fromFallback,
    ttsSkipped,
    sttSkipped,
    history: [...history, { role: 'user', content: userTranscript }, { role: 'assistant', content: aiText }],
  };

  return NextResponse.json(responseBody);
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'POST { audio?, text?, history?, systemPrompt? } to run a single voice turn.',
    runtime,
    maxDurationSec: maxDuration,
  });
}
