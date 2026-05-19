/**
 * useRealtimeEvents.ts
 *
 * React hook that subscribes to the Sentinel WebSocket event bus
 * and auto-increments the unread notification count in uiStore.
 *
 * Mount this once at app root (e.g. in a ProtectedLayout component)
 * after the user has authenticated.
 *
 * Usage:
 *   useRealtimeEvents({ tenantId: user.tenant_id });
 */
import { useEffect, useRef } from 'react';
import { useEventStore } from '../store/eventStore';
import { useUiStore } from '../store/uiStore';

interface Options {
  tenantId: string;
  /** Event type prefixes that should bump the unread counter. Default: all. */
  notifyPrefixes?: string[];
}

export function useRealtimeEvents({ tenantId, notifyPrefixes }: Options) {
  const subscribe = useEventStore((s) => s.subscribe);
  const disconnect = useEventStore((s) => s.disconnect);
  const events = useEventStore((s) => s.events);
  const setUnreadCount = useUiStore((s) => s.setUnreadCount);
  const unread = useUiStore((s) => s.unreadNotifications);
  const seenCount = useRef(0);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (!tenantId) return;
    subscribe(tenantId);
    return () => disconnect();
  }, [tenantId, subscribe, disconnect]);

  // Increment unread count when new events arrive
  useEffect(() => {
    if (events.length <= seenCount.current) return;
    const newEvents = events.slice(seenCount.current);
    seenCount.current = events.length;

    const notifiableCount = newEvents.filter((e) => {
      if (!notifyPrefixes || notifyPrefixes.length === 0) return true;
      return notifyPrefixes.some((p) => e.event_type.startsWith(p));
    }).length;

    if (notifiableCount > 0) {
      setUnreadCount(unread + notifiableCount);
    }
  }, [events, notifyPrefixes, setUnreadCount, unread]);
}
