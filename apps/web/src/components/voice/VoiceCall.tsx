"use client";

/**
 * <VoiceCall />
 *
 * "Click to call AI doctor" widget. Drop into any page to let patients
 * talk to the CureV voice agent in their browser.
 *
 *   <VoiceCall doctorName="Dr. Aria" />
 *
 * The widget uses WebRTC + ElevenLabs + OpenRouter. It falls back
 * gracefully:
 *   • Mic blocked / unavailable  → text input is always visible
 *   • ElevenLabs TTS missing     → browser-native speechSynthesis plays
 *   • OpenRouter error           → error banner with remediation hint
 *
 * Visual style matches the rest of CureV (warm cream / clinical teal)
 * and re-uses no external UI library beyond Tailwind.
 */

import { useState, useRef, useEffect } from 'react';
import { useVoiceCall, type ChatTurn, type VoiceRecommendation } from '@/lib/hooks/useVoiceCall';

export interface VoiceCallProps {
  /** Display name for the AI doctor. */
  doctorName?: string;
  /** Override the system prompt (e.g. scope to a specific condition). */
  systemPrompt?: string;
  /** Show a text fallback input even when the mic works. */
  showTextFallback?: boolean;
  /** Optional className applied to the wrapper. */
  className?: string;
  /** Called when the assistant emits a final recommendation. */
  onRecommendation?: (rec: VoiceRecommendation) => void;
}

export function VoiceCall({
  doctorName = 'Dr. Aria',
  systemPrompt,
  showTextFallback = true,
  className = '',
  onRecommendation,
}: VoiceCallProps) {
  const {
    turns,
    isRecording,
    isProcessing,
    isSpeaking,
    error,
    micReady,
    recommendation,
    startRecording,
    stopRecording,
    sendText,
    endCall,
    reset,
  } = useVoiceCall({ systemPrompt });

  const [textInput, setTextInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript to bottom on new turns.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length, isProcessing, isSpeaking]);

  // Fire the recommendation callback when one arrives.
  useEffect(() => {
    if (recommendation && onRecommendation) onRecommendation(recommendation);
  }, [recommendation, onRecommendation]);

  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = textInput.trim();
    if (!t) return;
    setTextInput('');
    await sendText(t);
  };

  const toggleMic = async () => {
    if (isRecording) await stopRecording();
    else await startRecording();
  };

  const status: 'idle' | 'recording' | 'processing' | 'speaking' = isRecording
    ? 'recording'
    : isProcessing
    ? 'processing'
    : isSpeaking
    ? 'speaking'
    : 'idle';

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-stone-200 bg-white/95 backdrop-blur shadow-xl shadow-stone-900/5 overflow-hidden ${className}`}
      style={{ minHeight: 520 }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100 bg-gradient-to-br from-amber-50 to-rose-50">
        <div className="relative">
          <div
            className={`h-11 w-11 rounded-full bg-gradient-to-br from-amber-200 to-rose-200 grid place-items-center text-stone-700 font-semibold`}
            aria-hidden
          >
            {doctorName
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
              status === 'idle' ? 'bg-stone-300' : 'bg-emerald-500 animate-pulse'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-900 truncate">{doctorName}</div>
          <div className="text-xs text-stone-500">{statusLabel(status)}</div>
        </div>
        {turns.length > 0 && (
          <button
            onClick={reset}
            className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded transition"
            aria-label="Reset conversation"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Transcript ─────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        style={{ maxHeight: 380 }}
      >
        {turns.length === 0 && (
          <div className="text-center text-stone-500 py-12 px-4">
            <div className="text-4xl mb-3">🎙️</div>
            <p className="text-sm">
              Tap the microphone and describe what's going on. {doctorName} will ask a few
              questions and suggest the right specialist.
            </p>
          </div>
        )}
        {turns.map((turn, i) => (
          <TurnBubble key={`${turn.timestamp}-${i}`} turn={turn} />
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2 bg-stone-100 text-stone-500 text-sm inline-flex items-center gap-1.5">
              <Dot delay={0} />
              <Dot delay={150} />
              <Dot delay={300} />
            </div>
          </div>
        )}
        {recommendation && <RecommendationCard rec={recommendation} />}
      </div>

      {/* ── Error banner ───────────────────────────────────────────── */}
      {error && (
        <div className="mx-5 mb-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs px-3 py-2">
          {error}
        </div>
      )}

      {/* ── Controls ───────────────────────────────────────────────── */}
      <div className="border-t border-stone-100 px-5 py-4 bg-stone-50/50 space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMic}
            disabled={isProcessing}
            className={`relative h-14 w-14 rounded-full grid place-items-center transition-all shadow-md ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
                : isProcessing
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            title={isRecording ? 'Tap to stop' : 'Tap to speak'}
          >
            {isRecording ? (
              <StopIcon className="h-5 w-5" />
            ) : (
              <MicIcon className="h-5 w-5" />
            )}
          </button>
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-medium text-stone-900">
              {status === 'recording'
                ? 'Listening…'
                : status === 'processing'
                ? 'Thinking…'
                : status === 'speaking'
                ? `${doctorName} is responding…`
                : micReady
                ? 'Hold to speak'
                : 'Tap to allow microphone'}
            </div>
            <div className="text-xs text-stone-500 truncate">
              {micReady
                ? `ElevenLabs voice · ${isProcessing ? 'OpenRouter LLM…' : 'Ready'}`
                : 'Mic permission needed for voice — text input works without it.'}
            </div>
          </div>
          <button
            type="button"
            onClick={endCall}
            className="text-xs text-stone-500 hover:text-rose-600 px-3 py-2 rounded-md transition"
            aria-label="End call"
          >
            End
          </button>
        </div>

        {showTextFallback && (
          <form onSubmit={handleSendText} className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type your message…"
              className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !textInput.trim()}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300 disabled:cursor-not-allowed hover:bg-stone-800 transition"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── bits ──────────────────────────────────────────────────────────

function TurnBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-stone-900 text-white rounded-br-sm'
            : 'bg-stone-100 text-stone-900 rounded-bl-sm'
        }`}
      >
        <div>{turn.content}</div>
        {!isUser && (turn.fromFallback || turn.model) && (
          <div className="mt-1 text-[10px] uppercase tracking-wide text-stone-500">
            {turn.fromFallback ? '↺ fallback · ' : ''}
            {turn.model || ''}
            {turn.fromFallback ? '' : ''}
          </div>
        )}
        {!isUser && turn.hasAudio && (
          <div className="mt-1 text-[10px] text-stone-500">🔊 ElevenLabs</div>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: VoiceRecommendation }) {
  const urgencyColor =
    rec.urgency === 'high'
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : rec.urgency === 'medium'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200';
  return (
    <div className={`rounded-xl border px-4 py-3 ${urgencyColor}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        Recommendation
      </div>
      <div className="mt-1 text-sm font-semibold">
        See {rec.specialty || 'a general physician'}{' '}
        {rec.urgency ? `· ${rec.urgency} urgency` : ''}
      </div>
      {rec.reasoning && (
        <div className="mt-1 text-xs opacity-80">{rec.reasoning}</div>
      )}
    </div>
  );
}

function statusLabel(status: 'idle' | 'recording' | 'processing' | 'speaking') {
  switch (status) {
    case 'recording':
      return 'Recording…';
    case 'processing':
      return 'Thinking…';
    case 'speaking':
      return 'Speaking…';
    default:
      return 'Ready · tap mic to start';
  }
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function MicIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}

function StopIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
