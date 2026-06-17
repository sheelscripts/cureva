/**
 * @deprecated Import from '@backend/app/ai/openrouter' (or '@cureva/backend')
 * for new code. This file is kept as a thin shim so legacy imports
 * `from '@backend/app/ai/gemini'` keep working.
 *
 * All CureV AI calls now route through OpenRouter (LLM + embeddings) and
 * ElevenLabs (STT + TTS). No Google Gemini keys are required.
 *
 * Provider split:
 *   • Chat (generateContent, generateStructuredOutput) → OpenRouter
 *     (Hermes 3 405B primary + free fallback).
 *   • Embeddings (embedContent) → OpenRouter text-embedding-3-small.
 *   • Audio transcription (transcribeAndTranslateAudio) → ElevenLabs STT.
 *   • Audio synthesis (TTS) for the voice-call agent → ElevenLabs.
 *
 * See:
 *   - backend/app/ai/openrouter.ts   (LLM + embeddings)
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
import { embedWithOpenRouter } from './embeddings';

// ─── re-exports (LLM) ──────────────────────────────────────────────

export { chatCompletion, chatCompletionWithFallback, chatCompletionJson, chatCompletionText, tryParseJson };

/**
 * Legacy `ai` export — retained so existing imports don't break.
 * Two methods are exposed, mirroring the old `@google/genai` shape:
 *   • `generateContent` → OpenRouter chat (Hermes 3 405B → fallback).
 *   • `embedContent`   → OpenRouter text-embedding-3-small (768-dim).
 */
export const ai = {
  models: {
    generateContent: async (args: any) => {
      const messages = normaliseGeminiContentsToMessages(args.contents);
      const result = await chatCompletion({
        messages,
        temperature: args.config?.temperature,
        maxTokens: args.config?.maxOutputTokens,
        forceJsonMode: args.config?.responseMimeType === 'application/json',
        responseSchema: args.config?.responseSchema,
      });
      return { text: result.text };
    },

    embedContent: async (args: { model?: string; contents: string | string[] }) => {
      const texts = Array.isArray(args.contents) ? args.contents : [args.contents];
      const vectors = await Promise.all(texts.map((t) => embedWithOpenRouter(t, args.model)));
      // Shape matches @google/genai's response.
      return {
        embeddings: vectors.map((values) => ({ values })),
      };
    },
  },
};

/**
 * Convert the various `@google/genai` `contents` shapes that legacy code
 * uses into the flat OpenAI-style message array expected by chatCompletion.
 *
 * Supported shapes:
 *   - string                                     → [{ role: 'user', content }]
 *   - { text: '...' }                            → [{ role: 'user', content }]
 *   - { role, parts: [{ text }] }                → [{ role, content: joined }]
 *   - [{ role, parts: [{ text }] }, ...]         → flat message list
 *   - { inlineData: {...}, text: '...' }         → text wins (audio handled separately)
 */
function normaliseGeminiContentsToMessages(contents: any): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  if (typeof contents === 'string') {
    return [{ role: 'user', content: contents }];
  }
  if (contents == null) {
    return [{ role: 'user', content: '' }];
  }
  if (!Array.isArray(contents)) {
    contents = [contents];
  }
  const out: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  for (const part of contents) {
    if (part == null) continue;
    if (typeof part === 'string') {
      out.push({ role: 'user', content: part });
      continue;
    }
    // { role, parts } — Gemini turn shape
    if (typeof part === 'object' && Array.isArray(part.parts)) {
      const role: 'system' | 'user' | 'assistant' =
        part.role === 'model' || part.role === 'assistant'
          ? 'assistant'
          : part.role === 'system'
          ? 'system'
          : 'user';
      const text = part.parts
        .map((p: any) => (typeof p === 'string' ? p : p?.text ?? ''))
        .filter(Boolean)
        .join('\n');
      if (text) out.push({ role, content: text });
      continue;
    }
    // { text } — bare Gemini text part
    if (typeof part === 'object' && typeof part.text === 'string') {
      out.push({ role: 'user', content: part.text });
      continue;
    }
    // { inlineData } — image/audio bytes. Out of scope for text models;
    // skip silently rather than stringify an object.
    if (typeof part === 'object' && part.inlineData) {
      continue;
    }
  }
  return out.length > 0 ? out : [{ role: 'user', content: '' }];
}

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
