"use client";

/**
 * useVoiceCall — drives the "Click to call AI doctor" experience.
 *
 * Responsibilities:
 *   • Mic permission + MediaRecorder lifecycle (WebRTC getUserMedia).
 *   • Encode each utterance to base64 webm and POST to /api/voice-call/turn.
 *   • Play the returned TTS audio.
 *   • Fall back to browser-native speechSynthesis if ElevenLabs TTS is unavailable.
 *   • Maintain conversation history.
 *
 * Browser support: requires HTTPS or localhost (getUserMedia restriction)
 * and MediaRecorder (Chrome/Edge/Safari 14.1+ / Firefox).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── types ─────────────────────────────────────────────────────────

export interface ChatTurn {
  role: 'user' | 'assistant';
  /** Plain text (always populated). */
  content: string;
  /** TTS audio as a blob: URL — caller is responsible for revoking. */
  audioUrl?: string;
  /** True when ElevenLabs returned audio for this turn. */
  hasAudio?: boolean;
  /** Which model answered (assistant only). */
  model?: string;
  /** True when the fallback free model was used. */
  fromFallback?: boolean;
  /** True when STT was skipped because `text` was sent instead of `audio`. */
  sttSkipped?: boolean;
  /** ms epoch — for ordering and UI display. */
  timestamp: number;
}

export interface UseVoiceCallOptions {
  /** Optional system prompt override (e.g. "specialist: cardiology"). */
  systemPrompt?: string;
  /** Auto-start the call when the hook mounts. */
  autoStart?: boolean;
  /** Stop the call after this many turns (default: 8 to leave room for wrap-up). */
  maxTurns?: number;
}

export interface UseVoiceCallResult {
  /** Conversation transcript, oldest first. */
  turns: ChatTurn[];
  /** True while the user is recording. */
  isRecording: boolean;
  /** True while STT + LLM + TTS are running. */
  isProcessing: boolean;
  /** True while the AI's TTS audio is playing. */
  isSpeaking: boolean;
  /** Most recent error message (cleared on next successful turn). */
  error: string | null;
  /** True when the mic permission has been granted. */
  micReady: boolean;
  /** True when the assistant emitted a JSON recommendation at the end. */
  hasRecommendation: boolean;
  /** Parsed recommendation, if any. */
  recommendation: VoiceRecommendation | null;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  /** Send a text turn without recording (useful when mic is unavailable). */
  sendText: (text: string) => Promise<void>;
  /** Stop everything — mic + playback + processing. */
  endCall: () => void;
  /** Clear history and reset state. */
  reset: () => void;
}

export interface VoiceRecommendation {
  specialty?: string;
  urgency?: 'low' | 'medium' | 'high';
  reasoning?: string;
}

interface TurnApiResponse {
  user_transcript: string;
  ai_text: string;
  ai_audio_base64: string;
  contentType: string;
  voiceId: string;
  model: string;
  fromFallback: boolean;
  ttsSkipped: boolean;
  sttSkipped: boolean;
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

// ─── helpers ───────────────────────────────────────────────────────

function base64ToBlobUrl(base64: string, contentType: string): string {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: contentType });
  return URL.createObjectURL(blob);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result is "data:audio/webm;base64,XXXX"
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function extractRecommendation(text: string): VoiceRecommendation | null {
  // Match a trailing {...} JSON block (either inline or on the last line).
  const fence = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  const candidates = [
    fence?.[1],
    (() => {
      const start = text.lastIndexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) return text.slice(start, end + 1);
      return undefined;
    })(),
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === 'object' && ('specialty' in parsed || 'urgency' in parsed)) {
        return parsed as VoiceRecommendation;
      }
    } catch {
      // ignore — keep looking
    }
  }
  return null;
}

function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'audio/webm';
}

// ─── hook ──────────────────────────────────────────────────────────

export function useVoiceCall(options: UseVoiceCallOptions = {}): UseVoiceCallResult {
  const { systemPrompt, autoStart = false, maxTurns = 8 } = options;

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [recommendation, setRecommendation] = useState<VoiceRecommendation | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const revokeObjectUrls = useCallback((list: ChatTurn[]) => {
    for (const t of list) {
      if (t.audioUrl) {
        try { URL.revokeObjectURL(t.audioUrl); } catch { /* ignore */ }
      }
    }
  }, []);

  const endCall = useCallback(() => {
    try {
      mediaRecorderRef.current?.state === 'recording' &&
        mediaRecorderRef.current?.stop();
    } catch { /* ignore */ }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    mediaRecorderRef.current = null;
    setIsRecording(false);
    setIsSpeaking(false);
  }, []);

  const reset = useCallback(() => {
    endCall();
    revokeObjectUrls(turns);
    setTurns([]);
    setError(null);
    setRecommendation(null);
  }, [endCall, revokeObjectUrls, turns]);

  // ─── record / send helpers ──────────────────────────────────────

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current && streamRef.current.active) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;
    setMicReady(true);
    return stream;
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || isProcessing) return;
    setError(null);
    try {
      const stream = await ensureStream();
      const mimeType = pickRecorderMime();
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        if (blob.size === 0) {
          setError('No audio captured. Check your microphone.');
          return;
        }
        await sendAudioBlob(blob, mimeType);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Microphone permission was denied. You can still chat via text.'
          : err?.name === 'NotFoundError'
          ? 'No microphone found on this device.'
          : err?.message || String(err);
      setError(msg);
      setMicReady(false);
    }
  }, [ensureStream, isRecording, isProcessing]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }, []);

  // ─── send ───────────────────────────────────────────────────────

  const sendAudioBlob = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (!isMountedRef.current) return;
      setIsProcessing(true);
      setError(null);
      try {
        const base64 = await blobToBase64(blob);
        const res = await fetch('/api/voice-call/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: base64,
            mimeType,
            history: turns
              .filter((t) => t.role === 'user' || t.role === 'assistant')
              .map((t) => ({ role: t.role, content: t.content })),
            systemPrompt,
          }),
        });
        await handleResponse(res);
      } catch (err: any) {
        setError(err?.message || 'Network error reaching /api/voice-call/turn');
      } finally {
        if (isMountedRef.current) setIsProcessing(false);
      }
    },
    [turns, systemPrompt]
  );

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;
      setIsProcessing(true);
      setError(null);
      try {
        const res = await fetch('/api/voice-call/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            history: turns
              .filter((t) => t.role === 'user' || t.role === 'assistant')
              .map((t) => ({ role: t.role, content: t.content })),
            systemPrompt,
          }),
        });
        await handleResponse(res);
      } catch (err: any) {
        setError(err?.message || 'Network error reaching /api/voice-call/turn');
      } finally {
        if (isMountedRef.current) setIsProcessing(false);
      }
    },
    [turns, systemPrompt]
  );

  const handleResponse = useCallback(
    async (res: Response) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let detail = text;
        try {
          const parsed = JSON.parse(text);
          detail = parsed.detail || parsed.error || text;
        } catch { /* keep raw text */ }
        setError(`Server error (${res.status}): ${detail}`);
        return;
      }
      const data = (await res.json()) as TurnApiResponse;
      applyTurnResponse(data);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const applyTurnResponse = useCallback(
    (data: TurnApiResponse) => {
      if (!isMountedRef.current) return;
      const now = Date.now();

      // 1. Append user turn
      const userTurn: ChatTurn = {
        role: 'user',
        content: data.user_transcript,
        sttSkipped: data.sttSkipped,
        timestamp: now - 1,
      };

      // 2. Append assistant turn (with audio blob if available)
      let audioUrl: string | undefined;
      if (data.ai_audio_base64 && data.contentType) {
        try {
          audioUrl = base64ToBlobUrl(data.ai_audio_base64, data.contentType);
        } catch (err) {
          console.warn('[useVoiceCall] failed to decode TTS audio:', err);
        }
      }
      const assistantTurn: ChatTurn = {
        role: 'assistant',
        content: data.ai_text,
        audioUrl,
        hasAudio: Boolean(audioUrl),
        model: data.model,
        fromFallback: data.fromFallback,
        timestamp: now,
      };

      setTurns((prev) => {
        // Cap the conversation to maxTurns so we don't grow unbounded.
        const next = [...prev, userTurn, assistantTurn].slice(-maxTurns * 2);
        return next;
      });

      // 3. Parse any recommendation
      const rec = extractRecommendation(data.ai_text);
      if (rec) setRecommendation(rec);

      // 4. Play the AI reply — prefer ElevenLabs TTS, fall back to browser TTS
      const playWithBrowserTts = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const utter = new SpeechSynthesisUtterance(data.ai_text);
        utter.rate = 1;
        utter.pitch = 1;
        utter.onstart = () => isMountedRef.current && setIsSpeaking(true);
        utter.onend = () => isMountedRef.current && setIsSpeaking(false);
        utter.onerror = () => isMountedRef.current && setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      };

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioElRef.current = audio;
        audio.onplay = () => isMountedRef.current && setIsSpeaking(true);
        audio.onended = () => isMountedRef.current && setIsSpeaking(false);
        audio.onerror = () => {
          if (isMountedRef.current) setIsSpeaking(false);
          playWithBrowserTts();
        };
        audio.play().catch(() => playWithBrowserTts());
      } else {
        playWithBrowserTts();
      }
    },
    [maxTurns]
  );

  // ─── autoStart (rarely used — mostly for demos) ─────────────────

  useEffect(() => {
    if (autoStart && !micReady && !isRecording) {
      void startRecording();
    }
    // intentionally only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      endCall();
      revokeObjectUrls(turns);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    turns,
    isRecording,
    isProcessing,
    isSpeaking,
    error,
    micReady,
    hasRecommendation: Boolean(recommendation),
    recommendation,
    startRecording,
    stopRecording,
    sendText,
    endCall,
    reset,
  };
}
