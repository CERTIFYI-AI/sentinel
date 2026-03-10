type Listener<T = unknown> = (payload: T) => void;

interface EventMap {
  "proxy:request": { id: string; model: string; status: string };
  "proxy:trust-update": { modelId: string; score: number };
  "security:finding": { id: string; severity: string; title: string };
  "security:threat": { id: string; type: string; blocked: boolean };
  "eval:run-update": { runId: string; status: string; score: number | null };
  "task:update": { id: string; status: string };
  "ciso:metric-update": { metric: string; value: number };
  "notification:new": { id: string; title: string; type: string };
  "ws:connected": undefined;
  "ws:disconnected": { reason: string };
  "ws:error": { error: string };
}

type EventName = keyof EventMap;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on<K extends EventName>(event: K, fn: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(fn as Listener);
    return () => {
      set.delete(fn as Listener);
      if (set.size === 0) this.listeners.delete(event);
    };
  }

  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] Error in listener for ${event}:`, err);
      }
    });
  }

  off<K extends EventName>(event: K, fn: Listener<EventMap[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(fn as Listener);
    if (set.size === 0) this.listeners.delete(event);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
export type { EventMap, EventName };
