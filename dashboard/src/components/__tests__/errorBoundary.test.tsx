// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// Unit tests for src/components/ErrorBoundary.tsx
// Verifies the enterprise fallback shows the *verbatim* error message (not a
// generic string), the failing route, an error id, and recovery actions —
// and that healthy children render untouched.

/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Boom({ message }: { message: string }): never {
  throw new Error(message);
}

function renderAt(path: string, ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ErrorBoundary>{ui}</ErrorBoundary>
    </MemoryRouter>,
  );
}

describe("ErrorBoundary", () => {
  // Silence the expected React error logging for these throw tests.
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("renders children unchanged when there is no error", () => {
    renderAt("/overview", <div>healthy content</div>);
    expect(screen.getByText("healthy content")).toBeInTheDocument();
  });

  it("shows the verbatim error message, not a generic one", () => {
    renderAt("/risks", <Boom message="Cannot read properties of undefined (reading 'bg')" />);
    expect(
      screen.getByText("Cannot read properties of undefined (reading 'bg')"),
    ).toBeInTheDocument();
    // It must NOT collapse to a generic fallback string.
    expect(screen.queryByText(/an unexpected rendering error occurred/i)).toBeNull();
  });

  it("surfaces the failing route and an error id", () => {
    renderAt("/audit-trail", <Boom message="kaboom" />);
    expect(screen.getByText("/audit-trail")).toBeInTheDocument();
    expect(screen.getByText(/^ERR-[0-9A-F]{6}$/)).toBeInTheDocument();
  });

  it("offers recovery actions", () => {
    renderAt("/dsr", <Boom message="kaboom" />);
    expect(screen.getByRole("button", { name: /retry render/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy diagnostics/i })).toBeInTheDocument();
    // alert role for assistive tech
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
