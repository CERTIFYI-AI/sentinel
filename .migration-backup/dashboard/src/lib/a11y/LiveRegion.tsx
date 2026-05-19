// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
} from "react";

type Politeness = "polite" | "assertive";

interface LiveRegionApi {
  announce: (message: string, politeness?: Politeness) => void;
}

const LiveRegionContext = createContext<LiveRegionApi | null>(null);

/**
 * Global aria-live region used to announce async updates (saved, error, etc.)
 * to assistive technology. WCAG 2.2 SC 4.1.3 Status Messages.
 */
export const LiveRegionProvider: FC<PropsWithChildren> = ({ children }) => {
  const [politeMsg, setPoliteMsg] = useState("");
  const [assertiveMsg, setAssertiveMsg] = useState("");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const announce = useCallback((message: string, politeness: Politeness = "polite") => {
    if (politeness === "assertive") {
      setAssertiveMsg(message);
      const t = setTimeout(() => setAssertiveMsg(""), 3000);
      timersRef.current.push(t);
    } else {
      setPoliteMsg(message);
      const t = setTimeout(() => setPoliteMsg(""), 3000);
      timersRef.current.push(t);
    }
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMsg}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMsg}
      </div>
    </LiveRegionContext.Provider>
  );
};

export function useLiveRegion(): LiveRegionApi {
  const ctx = useContext(LiveRegionContext);
  if (!ctx) {
    // Safe fallback: avoid crashing if provider is absent in tests.
    return { announce: () => undefined };
  }
  return ctx;
}
