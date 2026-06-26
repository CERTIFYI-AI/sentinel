import { useEffect, useRef, useCallback } from "react";
import { eventBus } from "../eventBus";
import type { EventName, EventMap } from "../eventBus";

/**
 * Subscribe to a typed EventBus event inside a React component.
 * Automatically cleans up on unmount.
 */
export function useEventBus<K extends EventName>(
  event: K,
  handler: (payload: EventMap[K]) => void
): void {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const unsubscribe = eventBus.on(event, (payload) => {
      savedHandler.current(payload);
    });
    return unsubscribe;
  }, [event]);
}

/**
 * Emit a typed event on the EventBus.
 * Returns a stable callback reference.
 */
export function useEventEmit<K extends EventName>(event: K) {
  return useCallback(
    (payload: EventMap[K]) => {
      eventBus.emit(event, payload);
    },
    [event]
  );
}
