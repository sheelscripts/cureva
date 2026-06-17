"use client";

/**
 * NotificationBell — fixed top-right bell with unread badge that opens a
 * dropdown list of live notifications. Backed by useRealtimeNotifications
 * (Supabase Realtime subscription to the `notifications` table).
 *
 * Silently renders nothing if Supabase returns no rows (graceful).
 */

import React, { useState } from 'react';
import { Bell, BellOff, ExternalLink, Check, CheckCheck } from 'lucide-react';
import { useRealtimeNotifications } from '@/lib/hooks/useRealtimeNotifications';

export interface NotificationBellProps {
  /** Optional className for the floating button. */
  className?: string;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const { notifications, unreadCount, isConnected, markAllRead, markRead } =
    useRealtimeNotifications({ limit: 50 });
  const [isOpen, setIsOpen] = useState(false);

  // Hide the bell entirely if there are zero notifications AND we're not
  // actively subscribed — keeps the UI clean until something arrives.
  const showBell = isConnected || notifications.length > 0 || unreadCount > 0;

  return (
    <>
      {showBell && (
        <button
          onClick={() => setIsOpen((v) => !v)}
          className={`fixed top-4 right-4 z-40 p-2.5 bg-white border border-stone-200 hover:border-stone-400 rounded-full shadow transition-all ${className}`}
          aria-label="Notifications"
        >
          {isConnected ? <Bell size={18} /> : <BellOff size={18} />}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-stone-600">
                Live Notifications
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-stone-300'}`} />
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-[10px] font-mono uppercase tracking-widest text-stone-500 hover:text-stone-900 flex items-center gap-1"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                {isConnected ? 'No notifications yet.' : 'Connecting...'}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-stone-50 hover:bg-stone-50 transition ${
                    !n.is_read ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                          {n.channel}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {formatTime(n.sent_at)}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-stone-900 truncate">
                        {n.title || n.type}
                      </div>
                      {n.body && (
                        <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                      )}
                      {n.payload?.deepLink && (
                        <a
                          href={n.payload.deepLink as string}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 hover:underline"
                        >
                          Open in WhatsApp <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="p-1 hover:bg-stone-200 rounded shrink-0"
                        aria-label="Mark read"
                      >
                        <Check size={12} className="text-stone-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
