import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type EventType =
  | "campaign.finding.critical"
  | "campaign.finding.high"
  | "campaign.complete"
  | "eval.run.failed"
  | "eval.metric.threshold_breach"
  | "hitl.item.created"
  | "hitl.item.resolved"
  | "compliance.gap.created"
  | "compliance.gap.resolved"
  | "model.registered"
  | "model.trustscore.updated"
  | "task.created"
  | "task.overdue"
  | "audit.chain.integrity_fail"
  | "posture.score.updated";

export interface SentinelEvent {
  id: string;
  type: EventType;
  source_module: "proxy" | "evals" | "security";
  timestamp: string;
  tenant_id: string;
  payload: Record<string, unknown>;
  read: boolean;
}

export type ActiveModuleId = "proxy" | "evals" | "security";

interface SentinelStore {
  activeModule: ActiveModuleId;
  setActiveModule: (id: ActiveModuleId) => void;

  events: SentinelEvent[];
  unreadCount: number;
  pushEvent: (event: SentinelEvent) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearEvents: () => void;

  postureScore: number | null;
  setPostureScore: (score: number) => void;

  globalError: string | null;
  setGlobalError: (msg: string | null) => void;

  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
}

export const useSentinelStore = create<SentinelStore>()(
  subscribeWithSelector((set) => ({
    activeModule: "proxy",
    setActiveModule: (id) => set({ activeModule: id }),

    events: [],
    unreadCount: 0,
    pushEvent: (event) =>
      set((s) => ({
        events: [event, ...s.events.slice(0, 200)],
        unreadCount: s.unreadCount + (event.read ? 0 : 1),
      })),
    markRead: (id) =>
      set((s) => ({
        events: s.events.map((e) =>
          e.id === id ? { ...e, read: true } : e,
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      })),
    markAllRead: () =>
      set((s) => ({
        events: s.events.map((e) => ({ ...e, read: true })),
        unreadCount: 0,
      })),
    clearEvents: () => set({ events: [], unreadCount: 0 }),

    postureScore: null,
    setPostureScore: (score) => set({ postureScore: score }),

    globalError: null,
    setGlobalError: (msg) => set({ globalError: msg }),

    wsConnected: false,
    setWsConnected: (connected) => set({ wsConnected: connected }),
  })),
);
