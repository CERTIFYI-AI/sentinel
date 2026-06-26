// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// - Registers @testing-library/jest-dom matchers.
// - Auto-cleans React Testing Library between tests.
// - Polyfills browser APIs jsdom does not ship.

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// ---- jsdom polyfills --------------------------------------------------------

if (typeof window !== "undefined") {
  // matchMedia — components using next-themes / responsive hooks need it.
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }

  // ResizeObserver — required by Radix UI primitives.
  if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === "undefined") {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
      ResizeObserverStub;
  }

  // IntersectionObserver — lazy-load + scroll-area primitives.
  if (
    typeof (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver ===
    "undefined"
  ) {
    class IntersectionObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): [] {
        return [];
      }
    }
    (globalThis as unknown as {
      IntersectionObserver: typeof IntersectionObserverStub;
    }).IntersectionObserver = IntersectionObserverStub;
  }
}

// ── Blob.text() polyfill — jsdom Blob doesn't implement .text() ─────────────
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function (): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(this)
    })
  }
}

// ── URL.createObjectURL / revokeObjectURL stubs ───────────────────────────────
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => 'blob:mock'
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = () => {}
}
