import logger from '@/lib/logger';
import { create } from 'zustand';
import { ComplianceEvent, ComplianceEventType } from '../types/events';

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`;

type Subscriber = (event: ComplianceEvent) => void;

interface EventBusState {
  events: ComplianceEvent[];
  subscribers: Map<string, Subscriber[]>;
  publish: (event: Omit<ComplianceEvent, 'id' | 'timestamp'>) => void;
  subscribe: (eventType: string, callback: Subscriber) => () => void;
  getEventsByEntity: (entityType: string, entityId: string) => ComplianceEvent[];
  getRecentEvents: (count?: number) => ComplianceEvent[];
  clearEvents: () => void;
}

export const useEventBus = create<EventBusState>((set, get) => ({
  events: [],
  subscribers: new Map(),
  publish: (eventData) => {
    const event: ComplianceEvent = {
      ...eventData,
      id: uid('EVT'),
      timestamp: new Date().toISOString(),
    };
    set(s => ({ events: [event, ...s.events].slice(0, 1000) }));
    const subs = get().subscribers;
    const handlers = [
      ...(subs.get(event.entityType) || []),
      ...(subs.get('*') || []),
    ];
    handlers.forEach(fn => { try { fn(event); } catch(e) { logger.error('Event handler error:', e); } });
  },
  subscribe: (eventType, callback) => {
    set(s => {
      const subs = new Map(s.subscribers);
      const list = subs.get(eventType) || [];
      subs.set(eventType, [...list, callback]);
      return { subscribers: subs };
    });
    return () => set(s => {
      const subs = new Map(s.subscribers);
      const list = (subs.get(eventType) || []).filter(fn => fn !== callback);
      subs.set(eventType, list);
      return { subscribers: subs };
    });
  },
  getEventsByEntity: (entityType, entityId) =>
    get().events.filter(e => e.entityType === entityType && e.entityId === entityId),
  getRecentEvents: (count = 50) => get().events.slice(0, count),
  clearEvents: () => set({ events: [] }),
}));

export { uid };
