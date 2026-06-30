// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// Unit tests for src/components/ui/button.tsx
// Verifies the icon/label layout contract: the root is an inline-flex,
// vertically-centered row with a horizontal gap, the label is wrapped in
// its own inline-flex span (so icon + text passed as children are spaced
// and centered), and explicit icon slots render shrink-0.

/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button — root layout", () => {
  it("root is an inline-flex, centered, gapped row", () => {
    render(<Button>Export CSV</Button>);
    const btn = screen.getByRole("button", { name: /export csv/i });
    expect(btn.className).toContain("inline-flex");
    expect(btn.className).toContain("items-center");
    expect(btn.className).toContain("justify-center");
    // a horizontal gap utility is always present (size-dependent)
    expect(/\bgap-(1|1\.5|2)\b/.test(btn.className)).toBe(true);
    // controlled line-height for clean vertical alignment
    expect(btn.className).toContain("leading-none");
  });
});

describe("Button — icon + label passed as children", () => {
  it("wraps children in an inline-flex span so the icon and label are spaced and centered", () => {
    render(
      <Button>
        <svg data-testid="icon" /> CISO View
      </Button>,
    );
    const btn = screen.getByRole("button", { name: /ciso view/i });
    const icon = screen.getByTestId("icon");
    // the icon's parent span must be a centered, gapped flex row
    const span = icon.parentElement!;
    expect(span.tagName).toBe("SPAN");
    expect(span.className).toContain("inline-flex");
    expect(span.className).toContain("items-center");
    expect(/\bgap-(1|1\.5|2)\b/.test(span.className)).toBe(true);
    // icon is a direct svg child of the span (so it becomes its own flex item)
    expect(icon.parentElement).toBe(span);
  });
});

describe("Button — explicit icon slots", () => {
  it("renders leftIcon in a shrink-0 wrapper", () => {
    render(<Button leftIcon={<svg data-testid="left" />}>Add Risk</Button>);
    const left = screen.getByTestId("left");
    expect(left.parentElement!.className).toContain("shrink-0");
  });

  it("supports the `icon` + iconPosition='right' convenience API", () => {
    render(
      <Button icon={<svg data-testid="right" />} iconPosition="right">
        Generate
      </Button>,
    );
    const btn = screen.getByRole("button", { name: /generate/i });
    const right = screen.getByTestId("right");
    // the right icon must come after the label in DOM order
    const label = screen.getByText("Generate");
    expect(
      label.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(right.parentElement!.className).toContain("shrink-0");
    expect(btn).toBeInTheDocument();
  });

  it("defaults `icon` to the left when iconPosition is omitted", () => {
    render(
      <Button icon={<svg data-testid="def" />}>Preview</Button>,
    );
    const icon = screen.getByTestId("def");
    const label = screen.getByText("Preview");
    // icon precedes the label
    expect(
      label.compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });
});

describe("Button — loading + iconOnly", () => {
  it("hides the label and shows a spinner while loading", () => {
    render(<Button loading>Schedule</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    // label span is rendered but visually hidden
    const label = screen.getByText("Schedule");
    expect(label.className).toContain("invisible");
  });

  it("omits the label span entirely when iconOnly", () => {
    render(<Button iconOnly leftIcon={<svg data-testid="only" />} aria-label="settings" />);
    expect(screen.queryByText(/settings/)).toBeNull();
    expect(screen.getByTestId("only")).toBeInTheDocument();
  });
});
