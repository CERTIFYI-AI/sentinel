import logger from '@/lib/logger';
/**
 * eventStore.ts — Sentinel Real-Time Event Store
 *
 * Connects to the backend WebSocket at /api/events/ws and
 * propagates incoming events to the rest of the UI via Zustand.
 *
 * Usage:
 *   const { events, connected, subscribe, publish } = useEventStore();
 */
import { create } from 'zustand';

export interface SentinelEvent {
  event_type: string;
  tenant_id: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

interface EventStore {
  events: SentinelEvent[];
  connected: boolean;
  error: string | null;
  _socket: WebSocket | null;
  subscribe: (tenantId: string) => void;
  disconnect: () => void;
  publish: (event: Omit<SentinelEvent, 'timestamp'>) => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 200;

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  connected: false,
  error: null,
  _socket: null,

  subscribe: (tenantId: string) => {
    const existing = get()._socket;
    if (existing) {
      existing.close();
    }

    const apiBase = import.meta.env.VITE_API_URL ?? '';
    const wsBase = apiBase
      ? apiBase.replace(/^http/, 'ws')
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
    const url = `${wsBase}/api/events/ws?tenant_id=${encodeURIComponent(tenantId)}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      set({ error: String(err), connected: false });
      return;
    }

    socket.onopen = () => {
      set({ connected: true, error: null, _socket: socket });
      console.info('[EventStore] WebSocket connected for tenant:', tenantId);
    };

    socket.onmessage = (msg) => {
      try {
        const event: SentinelEvent = JSON.parse(msg.data as string);
        set((state) => ({
          events: [...state.events.slice(-MAX_EVENTS + 1), event],
        }));
      } catch {
        logger.warn('[EventStore] Failed to parse event:', msg.data);
      }
    };

    socket.onerror = (err) => {
      logger.error('[EventStore] WebSocket error:', err);
      set({ error: 'WebSocket connection error', connected: false });
    };

    socket.onclose = () => {
      set({ connected: false, _socket: null });
      console.info('[EventStore] WebSocket closed');
      // Auto-reconnect after 5s
      setTimeout(() => {
        if (!get().connected) {
          get().subscribe(tenantId);
        }
      }, 5000);
    };

    set({ _socket: socket });
  },

  disconnect: () => {
    const socket = get()._socket;
    if (socket) {
      socket.close();
    }
    set({ connected: false, _socket: null });
  },

  publish: (event) => {
    const socket = get()._socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(event));
    } else {
      logger.warn('[EventStore] Cannot publish - not connected');
    }
  },

  clearEvents: () => set({ events: [] }),
}));

/**
 * Hook to subscribe to events of a specific type.
 * Returns events filtered by event_type prefix.
 */
export function useEventsByType(eventTypePrefix: string): SentinelEvent[] {
  return useEventStore((s) =>
    s.events.filter((e) => e.event_type.startsWith(eventTypePrefix))
  );
}

/**
 * Hook that returns the latest event matching a given prefix.
 */
export function useLatestEvent(eventTypePrefix: string): SentinelEvent | null {
  const events = useEventsByType(eventTypePrefix);
  return events.length > 0 ? events[events.length - 1] : null;
}
