/**
 * ElevenLabs client — STT (Speech-to-Text) and TTS (Text-to-Speech).
 *
 * Replaces the previous `@google/genai` audio path. The scribe agent now
 * uses `transcribeAndTranslateAudio` (ElevenLabs STT + optional LLM
 * translation step), and the voice-call agent uses `synthesizeSpeech`
 * for AI replies.
 *
 * Free tier (subject to ElevenLabs' current limits — verify at
 * https://elevenlabs.io/app/usage):
 *   • STT: ~1 hour/month of audio
 *   • TTS: 10,000 characters/month on the free plan
 *
 * Docs:
 *   • STT: https://elevenlabs.io/docs/api-reference/speech-to-text
 *   • TTS: https://elevenlabs.io/docs/api-reference/text-to-speech
 */

import { chatCompletionText } from './openrouter';

// ─── config ────────────────────────────────────────────────────────

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

function pickApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || '';
}

function pickSttModel(): string {
  return process.env.ELEVENLABS_STT_MODEL || 'scribe_v1';
}

function pickDefaultVoiceId(): string {
  // "Rachel" — default free voice, English, female, calm clinical tone.
  return process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
}

// ─── STT ───────────────────────────────────────────────────────────

export interface SttResult {
  text: string;
  language?: string;
  /** Confidence per word if ElevenLabs returns them. */
  words?: Array<{ text: string; start: number; end: number; confidence: number }>;
  raw?: unknown;
}

export class ElevenLabsError extends Error {
  constructor(message: string, public readonly status?: number, public readonly raw?: unknown) {
    super(message);
    this.name = 'ElevenLabsError';
  }
}

/**
 * Transcribe audio bytes (base64) using ElevenLabs STT.
 * Returns the transcript in the original spoken language. If a
 * `systemInstruction` is provided, an extra LLM pass is applied for
 * Hindi/Hinglish → English translation so the downstream scribe agent
 * still gets an English SOAP transcript.
 */
export async function transcribeAndTranslateAudio(
  audioBase64: string,
  mimeType = 'audio/webm',
  systemInstruction?: string
): Promise<string> {
  const transcript = (await speechToText(audioBase64, mimeType)).text.trim();
  if (!transcript) return '';

  // Translation step (Hindi/Hinglish → English). Heuristic: if the
  // transcript contains Devanagari, or many common Hinglish markers,
  // pass it through the LLM to normalise. The instruction is otherwise
  // advisory and doesn't gate the translation.
  if (shouldTranslate(transcript)) {
    try {
      const translated = await chatCompletionText({
        messages: [
          {
            role: 'system',
            content:
              systemInstruction ||
              'You are a medical scribe. If the transcript is in Hindi or Hinglish, translate it to English while preserving medical terms. If it is already English, return it unchanged. Output the transcript only — no preamble, no labels.',
          },
          { role: 'user', content: transcript },
        ],
      });
      return translated || transcript;
    } catch (err) {
      // Translation is best-effort — fall back to raw transcript.
      console.warn('[ElevenLabs] translation step failed, returning raw transcript:', err);
      return transcript;
    }
  }

  return transcript;
}

function shouldTranslate(text: string): boolean {
  if (/[\u0900-\u097F]/.test(text)) return true; // Devanagari
  // Common Hinglish markers — we err on the side of translating to keep
  // downstream English-only agents working without manual cleanup.
  const hinglishMarkers = /\b(hai|hain|kya|kyun|mera|meri|mujhe|mujhko|aap|aapko|nahi|nahin|haan|theek|dard|bukhar|kabhi|kabhi nahi|kuch|kuch nahi|lekin|aur|bahut|thoda|samajh|samajh nahi|kyunki|isliye|tab|phir|abhi|aaj|kal|subah|raat|subah|dopahar|namaste|shukriya|dhanyavaad)\b/i;
  return hinglishMarkers.test(text);
}

/**
 * Low-level ElevenLabs STT call. Posts a multipart/form-data request
 * to /v1/speech-to-text with the audio file.
 */
export async function speechToText(
  audioBase64: string,
  mimeType = 'audio/webm'
): Promise<SttResult> {
  const apiKey = pickApiKey();
  if (!apiKey) {
    throw new ElevenLabsError(
      'ELEVENLABS_API_KEY not configured. Add it to apps/web/.env.local.'
    );
  }

  // Decode base64 → Buffer for multipart upload.
  const buffer = Buffer.from(audioBase64, 'base64');
  // Pick a sensible filename extension per mime type.
  const ext =
    mimeType.includes('webm')
      ? 'webm'
      : mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('wav')
      ? 'wav'
      : mimeType.includes('mp3') || mimeType.includes('mpeg')
      ? 'mp3'
      : mimeType.includes('mp4') || mimeType.includes('m4a')
      ? 'm4a'
      : 'bin';
  const filename = `recording.${ext}`;

  const form = new FormData();
  form.append('model_id', pickSttModel());
  form.append('file', new Blob([buffer], { type: mimeType }), filename);
  // Scribe_v1 supports diarisation; cheap on the free tier.
  // We leave it off so the call stays cheap — the doctor/patient
  // distinction is recovered by the LLM downstream.
  form.append('tag_audio_events', 'false');

  const res = await fetch(`${ELEVENLABS_BASE}/speech-to-text`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ElevenLabsError(
      `ElevenLabs STT ${res.status}: ${text.slice(0, 400) || res.statusText}`,
      res.status,
      text
    );
  }

  const data = (await res.json()) as {
    text?: string;
    language?: string;
    words?: SttResult['words'];
  };

  return {
    text: (data.text || '').trim(),
    language: data.language,
    words: data.words,
    raw: data,
  };
}

// ─── TTS ───────────────────────────────────────────────────────────

export interface TtsResult {
  /** Raw audio bytes (mp3). Caller is responsible for base64-encoding
   *  if it needs to ship them over JSON. */
  audio: ArrayBuffer;
  contentType: string;
  voiceId: string;
  modelId: string;
  charactersBilled: number;
}

/**
 * Synthesise speech from text using ElevenLabs TTS. Returns raw
 * audio bytes (mp3 by default). Throws on missing key / API errors.
 */
export async function synthesizeSpeech(
  text: string,
  options: {
    voiceId?: string;
    modelId?: string;
    format?: 'mp3_44100_128' | 'mp3_22050_32' | 'pcm_16000' | 'pcm_22050' | 'pcm_44100';
  } = {}
): Promise<TtsResult> {
  const apiKey = pickApiKey();
  if (!apiKey) {
    throw new ElevenLabsError(
      'ELEVENLABS_API_KEY not configured. Add it to apps/web/.env.local.'
    );
  }
  if (!text || !text.trim()) {
    throw new ElevenLabsError('Cannot synthesize empty text.');
  }

  const voiceId = options.voiceId || pickDefaultVoiceId();
  const modelId = options.modelId || process.env.ELEVENLABS_TTS_MODEL || 'eleven_turbo_v2_5';
  const format = options.format || 'mp3_44100_128';

  const url = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}?output_format=${format}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new ElevenLabsError(
      `ElevenLabs TTS ${res.status}: ${errText.slice(0, 400) || res.statusText}`,
      res.status,
      errText
    );
  }

  const audio = await res.arrayBuffer();
  return {
    audio,
    contentType: res.headers.get('content-type') || 'audio/mpeg',
    voiceId,
    modelId,
    charactersBilled: text.length,
  };
}

/**
 * Convenience wrapper that returns the audio as a base64 string — handy
 * for shipping TTS results over JSON to the browser.
 */
export async function synthesizeSpeechBase64(
  text: string,
  options?: Parameters<typeof synthesizeSpeech>[1]
): Promise<{ audioBase64: string; contentType: string; voiceId: string; charactersBilled: number }> {
  const r = await synthesizeSpeech(text, options);
  return {
    audioBase64: Buffer.from(r.audio).toString('base64'),
    contentType: r.contentType,
    voiceId: r.voiceId,
    charactersBilled: r.charactersBilled,
  };
}
