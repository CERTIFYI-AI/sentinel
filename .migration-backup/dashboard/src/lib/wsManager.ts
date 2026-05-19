// @ts-nocheck
import logger from '@/lib/logger';
import { eventBus } from "./eventBus";
import type { EventMap } from "./eventBus";
import { queryClient } from "./queryClient";
import { QK } from "./queryKeys";
import { useSentinelStore } from "./store";

const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws";
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

let ws: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getBackoff(): number {
  const ms = Math.min(
    RECONNECT_BASE_MS * 2 ** reconnectAttempt,
    RECONNECT_MAX_MS
  );
  return ms + Math.floor(Math.random() * 500);
}

function routeMessage(raw: string): void {
  let msg: { event: string; data: unknown };
  try {
    msg = JSON.parse(raw);
  } catch {
    logger.warn("[WS] Non-JSON message:", raw);
    return;
  }

  const { event, data } = msg;

  switch (event) {
    case "proxy:request":
      eventBus.emit("proxy:request", data as EventMap["proxy:request"]);
      queryClient.invalidateQueries({ queryKey: QK.overview });
      break;
    case "proxy:trust-update":
      eventBus.emit("proxy:trust-update", data as EventMap["proxy:trust-update"]);
      queryClient.invalidateQueries({ queryKey: QK.trustScore });
      break;
    case "security:finding":
      eventBus.emit("security:finding", data as EventMap["security:finding"]);
      queryClient.invalidateQueries({ queryKey: QK.securityFindings });
      queryClient.invalidateQueries({ queryKey: QK.securityOverview });
      break;
    case "security:threat":
      eventBus.emit("security:threat", data as EventMap["security:threat"]);
      queryClient.invalidateQueries({ queryKey: QK.threatFeed });
      break;
    case "eval:run-update":
      eventBus.emit("eval:run-update", data as EventMap["eval:run-update"]);
      queryClient.invalidateQueries({ queryKey: QK.evalRuns });
      queryClient.invalidateQueries({ queryKey: QK.evalSummary });
      break;
    case "task:update":
      eventBus.emit("task:update", data as EventMap["task:update"]);
      queryClient.invalidateQueries({ queryKey: QK.tasks });
      queryClient.invalidateQueries({ queryKey: QK.taskStats });
      break;
    case "ciso:metric-update":
      eventBus.emit("ciso:metric-update", data as EventMap["ciso:metric-update"]);
      queryClient.invalidateQueries({ queryKey: QK.cisoMetrics });
      break;
    case "notification:new":
      eventBus.emit("notification:new", data as EventMap["notification:new"]);
      queryClient.invalidateQueries({ queryKey: QK.notifications });
      queryClient.invalidateQueries({ queryKey: QK.unreadCount });
      break;
    default:
      logger.warn("[WS] Unknown event:", event);
  }
}

export function connectWs(token?: string): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const url = token ? `${WS_BASE}?token=${token}` : WS_BASE;
  ws = new WebSocket(url);

  ws.onopen = () => {
    reconnectAttempt = 0;
    useSentinelStore.getState().setWsConnected(true);
    eventBus.emit("ws:connected", undefined);
  };

  ws.onmessage = (e) => {
    routeMessage(e.data as string);
  };

  ws.onclose = (e) => {
    useSentinelStore.getState().setWsConnected(false);
    eventBus.emit("ws:disconnected", { reason: e.reason || "closed" });
    scheduleReconnect();
  };

  ws.onerror = () => {
    eventBus.emit("ws:error", { error: "WebSocket error" });
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const delay = getBackoff();
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => connectWs(), delay);
}

export function disconnectWs(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  useSentinelStore.getState().setWsConnected(false);
}
