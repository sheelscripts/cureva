"use client";

/**
 * useRealtimeNotifications
 *
 * Subscribes to Supabase Realtime on the `notifications` table so the
 * frontdesk / doctor dashboard receives live alerts as agents create them
 * (escalations, WhatsApp deep links, recovery attempts, etc.).
 *
 * The notifications payload includes:
 *   • `payload.deepLink`  — for `channel: 'whatsapp' | 'sms'`, a wa.me or
 *                            sms: URI that the frontdesk clicks to deliver.
 *   • `payload.deliveryMethod` — 'deep_link' | 'resend' | 'in_app'.
 *
 * Usage:
 *
 *   const { notifications, unreadCount, markAllRead } =
 *     useRealtimeNotifications({ userId: session.user.id });
 *
 *   <a href={n.payload?.deepLink} target="_blank" rel="noreferrer">
 *     Open in WhatsApp
 *   </a>
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/db/supabase';

// ─── types ─────────────────────────────────────────────────────────

/** Mirrors the `notifications` table column shape. Kept local until
 *  the @cureva/types package gains a notification module. */
export interface NotificationPayload {
  /** For whatsapp/sms channels: the wa.me or sms: deep link. */
  deepLink?: string;
  /** How the message is delivered externally. */
  deliveryMethod?: 'deep_link' | 'resend' | 'in_app';
  /** Patient phone (debug / display). */
  phone?: string;
  /** Patient name (debug / display). */
  patientName?: string;
  /** Resend provider message ID, when applicable. */
  providerId?: string;
  /** Resend error string, if the email failed. */
  error?: string;
  /** Arbitrary structured data from the agent. */
  [key: string]: unknown;
}

export interface NotificationRow {
  id: string;
  user_id: string | null;
  patient_id: string | null;
  type: string;
  title: string | null;
  body: string | null;
  payload: NotificationPayload;
  channel: 'whatsapp' | 'sms' | 'email' | 'in_app' | string;
  sent_at: string;
  read_at: string | null;
  is_read: boolean;
}

export interface UseRealtimeNotificationsOptions {
  /** Filter to notifications addressed to a specific user (RLS-respected). */
  userId?: string;
  /** Filter to notifications for a specific patient. */
  patientId?: string;
  /** Cap the in-memory list size (default 100). */
  limit?: number;
  /** Disable the realtime channel (useful for tests / SSR). */
  enabled?: boolean;
}

export interface UseRealtimeNotificationsResult {
  notifications: NotificationRow[];
  unreadCount: number;
  isConnected: boolean;
  /** Mark every currently-loaded notification as read. */
  markAllRead: () => Promise<void>;
  /** Mark a single notification as read. */
  markRead: (id: string) => Promise<void>;
}

// ─── hook ──────────────────────────────────────────────────────────

export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsResult {
  const { userId, patientId, limit = 100, enabled = true } = options;

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Build a stable filter string for the Postgres channel.
  const filterString = useMemo(() => {
    if (userId) return `user_id=eq.${userId}`;
    if (patientId) return `patient_id=eq.${patientId}`;
    return undefined;
  }, [userId, patientId]);

  // Initial fetch — pulls the most recent rows so the UI isn't empty on
  // first paint, then realtime patches keep it in sync.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load() {
      try {
        let q = supabase
          .from('notifications')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(limit);
        if (userId) q = q.eq('user_id', userId);
        if (patientId) q = q.eq('patient_id', patientId);
        const { data, error } = await q;
        if (cancelled) return;
        if (error) {
          console.warn('[useRealtimeNotifications] initial fetch failed:', error);
          return;
        }
        setNotifications((data ?? []) as NotificationRow[]);
      } catch (err) {
        console.warn('[useRealtimeNotifications] initial fetch threw:', err);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, patientId, limit]);

  // Realtime subscription. Re-creates whenever filters change.
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return; // guard SSR

    const channel = supabase
      .channel(`notifications:${userId ?? patientId ?? 'all'}`)
      .on(
        // Postgres change events on the notifications table.
        // We use the JS client filter syntax so RLS-respecting clients only
        // receive rows they're allowed to see.
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          ...(filterString ? { filter: filterString } : {}),
        },
        (payload: { eventType: string; new: NotificationRow; old: Partial<NotificationRow> }) => {
          setNotifications((prev) => {
            if (payload.eventType === 'INSERT') {
              const next = [payload.new, ...prev];
              return next.slice(0, limit);
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((n) => (n.id === payload.new.id ? payload.new : n));
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((n) => n.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, filterString, limit]);

  // ─── actions ────────────────────────────────────────────────────

  const markRead = useCallback(async (id: string) => {
    // Optimistic update so the badge decrements instantly.
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) console.warn('[useRealtimeNotifications] markRead failed:', error);
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.is_read ? n : { ...n, is_read: true, read_at: now }))
    );
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .in('id', unreadIds);
    if (error) console.warn('[useRealtimeNotifications] markAllRead failed:', error);
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  return { notifications, unreadCount, isConnected, markAllRead, markRead };
}
