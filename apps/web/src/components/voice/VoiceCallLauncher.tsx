"use client";

/**
 * VoiceCallLauncher — floating "Talk to AI Doctor" button that opens
 * the <VoiceCall /> widget in a bottom-right modal.
 *
 * Drop into any patient-facing page. Mounts a fixed button bottom-right;
 * clicking opens a 420×560 panel with the full voice-call widget.
 */

import React, { useState } from 'react';
import { Mic, X, Phone, PhoneOff } from 'lucide-react';
import { VoiceCall } from './VoiceCall';

export interface VoiceCallLauncherProps {
  /** Display name for the AI doctor (default "Dr. Aria"). */
  doctorName?: string;
  /** Override the voice-call system prompt. */
  systemPrompt?: string;
  /** Optional className for the launcher button. */
  className?: string;
}

export default function VoiceCallLauncher({
  doctorName = 'Dr. Aria',
  systemPrompt,
  className = '',
}: VoiceCallLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating launcher — bottom-right, stays out of the way */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full shadow-lg transition-all hover:scale-105 ${className}`}
        aria-label={isOpen ? 'Close voice call' : 'Start voice call'}
      >
        {isOpen ? <PhoneOff size={18} /> : <Mic size={18} />}
        <span className="text-sm font-medium">
          {isOpen ? 'End Call' : 'Talk to ' + doctorName.split(' ').slice(-1)[0]}
        </span>
      </button>

      {/* Modal panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden"
          style={{ height: 560 }}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-stone-600">
                Live · {doctorName}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-stone-200 rounded transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* The actual voice widget */}
          <div className="h-[calc(100%-49px)]">
            <VoiceCall
              doctorName={doctorName}
              systemPrompt={systemPrompt}
              showTextFallback
            />
          </div>
        </div>
      )}
    </>
  );
}
