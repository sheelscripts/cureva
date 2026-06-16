/**
 * @deprecated Import from '@backend/app/ai/openrouter' (or '@cureva/backend')
 * for new code. This file is kept as a thin shim so legacy imports
 * `from '@backend/app/ai/gemini'` keep working.
 *
 * Provider split:
 *   • Chat (generateContent, generateStructuredOutput) → OpenRouter
 *     (Hermes 3 405B primary + free fallback).
 *   • Audio transcription (transcribeAndTranslateAudio) → ElevenLabs STT.
 *   • Embeddings (embedContent) → Google text-embedding-004.
 *     OpenRouter doesn't expose a free embeddings model, so the RAG
 *     retriever keeps using Gemini for embeddings. If GEMINI_API_KEY
 *     is unset or out of credits, `embedContent` throws and the RAG
 *     retriever's try/catch returns an empty result set — the rest of
 *     CureV (triage, scribe, voice call) keeps working.
 *   • Audio synthesis (TTS) for the voice-call agent → ElevenLabs
 *     (see backend/app/ai/elevenlabs.ts).
 *
 * See:
 *   - backend/app/ai/openrouter.ts   (LLM)
 *   - backend/app/ai/elevenlabs.ts   (STT / TTS)
 */

import {
  chatCompletion,
  chatCompletionWithFallback,
  chatCompletionJson,
  chatCompletionText,
  tryParseJson,
} from './openrouter';
import { transcribeAndTranslateAudio as transcribeWithElevenLabs } from './elevenlabs';
import { embedWithGemini } from './embeddings';

// ─── re-exports (LLM) ──────────────────────────────────────────────

export { chatCompletion, chatCompletionWithFallback, chatCompletionJson, chatCompletionText, tryParseJson };

/**
 * Legacy `ai` export — retained so existing imports don't break.
 * Two methods are exposed, mirroring the old `@google/genai` shape:
 *   • `generateContent` → OpenRouter chat (Hermes 3 405B → fallback).
 *   • `embedContent`   → Google text-embedding-004 (no fallback).
 */
export const ai = {
  models: {
    generateContent: async (args: any) => {
      const result = await chatCompletion({
        messages: [
          ...(args.config?.systemInstruction
            ? [{ role: 'system' as const, content: String(args.config.systemInstruction) }]
            : []),
          { role: 'user' as const, content: String(args.contents) },
        ],
        temperature: args.config?.temperature,
        maxTokens: args.config?.maxOutputTokens,
        forceJsonMode: args.config?.responseMimeType === 'application/json',
        responseSchema: args.config?.responseSchema,
      });
      return { text: result.text };
    },

    embedContent: async (args: { model?: string; contents: string | string[] }) => {
      const texts = Array.isArray(args.contents) ? args.contents : [args.contents];
      const vectors = await Promise.all(texts.map((t) => embedWithGemini(t, args.model)));
      // Shape matches @google/genai's response.
      return {
        embeddings: vectors.map((values) => ({ values })),
      };
    },
  },
};

// ─── legacy compat: generateStructuredOutput ────────────────────────

/**
 * @deprecated Use `chatCompletionJson` from openrouter.ts. Kept for
 * compatibility with the existing agent code.
 */
export async function generateStructuredOutput<T>(
  prompt: string,
  responseSchema: Record<string, any>,
  systemInstruction = 'You are a professional assistant. Be concise and accurate.'
): Promise<T | null> {
  const { data } = await chatCompletionJson<T>({
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ],
    responseSchema,
    schemaName: 'cureva_structured',
  });
  return data;
}

// ─── legacy compat: transcribeAndTranslateAudio ─────────────────────

/**
 * @deprecated Use `transcribeAndTranslateAudio` from elevenlabs.ts.
 * Kept here for compatibility with the scribe agent.
 */
export async function transcribeAndTranslateAudio(
  audioBase64: string,
  mimeType = 'audio/webm',
  systemInstruction?: string
): Promise<string> {
  return transcribeWithElevenLabs(audioBase64, mimeType, systemInstruction);
}
