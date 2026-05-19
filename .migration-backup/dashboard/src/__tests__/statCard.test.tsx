// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// F.1 — Unit tests for src/components/ui/StatCard.tsx
// Covers: basic render, value display, delta/trend direction, href wrapping,
// and data-lineage tooltip affordance — using accessible queries only.

/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/ui/StatCard";

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------
describe("StatCard — basic rendering", () => {
  it("renders the label as uppercase text on screen", () => {
    render(<StatCard label="Open Risks" value={42} />);
    // The label is rendered in a <p> — find by text (case-insensitive)
    expect(screen.getByText(/open risks/i)).toBeInTheDocument();
  });

  it("renders the numeric value", () => {
    render(<StatCard label="Controls" value={128} />);
    // The aria-label on the value paragraph includes the label + value
    expect(screen.getByLabelText(/Controls:\s*128/i)).toBeInTheDocument();
  });

  it("renders a string value", () => {
    render(<StatCard label="Status" value="Healthy" />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders without crashing when only required props are provided", () => {
    const { container } = render(<StatCard label="Score" value={0} />);
    expect(container.firstChild).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Delta / trend direction
// ---------------------------------------------------------------------------
describe("StatCard — delta / trend", () => {
  it("shows an upward arrow when deltaDir is 'up'", () => {
    render(<StatCard label="Score" value={90} delta="+5%" deltaDir="up" />);
    // The component renders ▲ for up
    expect(screen.getByText(/▲/)).toBeInTheDocument();
  });

  it("shows a downward arrow when deltaDir is 'down'", () => {
    render(<StatCard label="Score" value={80} delta="-3%" deltaDir="down" />);
    expect(screen.getByText(/▼/)).toBeInTheDocument();
  });

  it("displays the delta value text next to the arrow", () => {
    render(<StatCard label="Score" value={80} delta="12%" deltaDir="up" />);
    expect(screen.getByText(/12%/)).toBeInTheDocument();
  });

  it("renders no delta element when delta prop is omitted", () => {
    render(<StatCard label="Score" value={80} />);
    expect(screen.queryByText(/▲/)).toBeNull();
    expect(screen.queryByText(/▼/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// aria-label encodes direction for screen readers
// ---------------------------------------------------------------------------
describe("StatCard — aria labelling", () => {
  it("aria-label includes 'increased' for upward delta", () => {
    render(<StatCard label="Revenue" value="$500" delta="10%" deltaDir="up" />);
    const el = screen.getByLabelText(/increased 10%/i);
    expect(el).toBeInTheDocument();
  });

  it("aria-label includes 'decreased' for downward delta", () => {
    render(<StatCard label="Revenue" value="$400" delta="5%" deltaDir="down" />);
    const el = screen.getByLabelText(/decreased 5%/i);
    expect(el).toBeInTheDocument();
  });

  it("aria-label contains the label and value when no delta", () => {
    render(<StatCard label="Incidents" value={7} />);
    // aria-label is "Incidents: 7" with no delta suffix
    const el = screen.getByLabelText(/Incidents:\s*7/i);
    expect(el).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// href wrapping
// ---------------------------------------------------------------------------
describe("StatCard — href prop", () => {
  it("wraps the card in an anchor when href is provided", () => {
    render(<StatCard label="Risks" value={5} href="/risk-register" />);
    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/risk-register");
  });

  it("does not render an anchor when href is omitted", () => {
    render(<StatCard label="Risks" value={5} />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Data lineage tooltip affordance
// ---------------------------------------------------------------------------
describe("StatCard — data lineage", () => {
  it("renders the lineage info icon when lineage prop is supplied", () => {
    render(
      <StatCard
        label="Open Findings"
        value={3}
        lineage={{
          asOf: new Date().toISOString(),
          source: "Risk Register live query",
          method: "COUNT(*) WHERE status='OPEN'",
          slaBreach: "ok",
        }}
      />,
    );
    // The Info icon has an aria-label containing "Data lineage"
    expect(screen.getByLabelText(/Data lineage for Open Findings/i)).toBeInTheDocument();
  });

  it("does not render a lineage icon when lineage prop is absent", () => {
    render(<StatCard label="Score" value={10} />);
    expect(screen.queryByLabelText(/data lineage/i)).toBeNull();
  });
});
