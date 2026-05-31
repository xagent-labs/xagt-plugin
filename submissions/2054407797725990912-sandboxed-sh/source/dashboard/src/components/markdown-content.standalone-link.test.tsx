import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { MarkdownContent } from "./markdown-content";

// InlineFileCard fetches /api/fs/validate on mount; stub it so the card stays
// in its rendered (non-error) state and no real network call escapes jsdom.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ exists: true, size: 123 }),
      text: async () => "",
    }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("file link rendering", () => {
  it("renders a file mentioned mid-prose as a compact preview chip, not a download card", () => {
    render(
      <MarkdownContent content="See the file [orchestrator_mcp.rs](src/api/orchestrator_mcp.rs) for the API pattern." />
    );

    // Chip: clickable preview button, no download affordance.
    expect(screen.getByTitle("Click to preview")).toBeInTheDocument();
    expect(screen.queryByTitle("Download")).not.toBeInTheDocument();
    expect(screen.getByText("orchestrator_mcp.rs")).toBeInTheDocument();
  });

  it("renders a standalone file link (its own paragraph) as the full download card", () => {
    render(<MarkdownContent content={"[report.pdf](report.pdf)"} />);

    // Card: has a Download button; not the inline chip.
    expect(screen.getByTitle("Download")).toBeInTheDocument();
    expect(screen.queryByTitle("Click to preview")).not.toBeInTheDocument();
  });

  it("treats a single-link bullet item as standalone (download card)", () => {
    render(<MarkdownContent content={"- [report.pdf](report.pdf)"} />);

    expect(screen.getByTitle("Download")).toBeInTheDocument();
    expect(screen.queryByTitle("Click to preview")).not.toBeInTheDocument();
  });

  it("leaves regular http(s) links as plain anchors", () => {
    render(
      <MarkdownContent content="Check [the docs](https://example.com/guide) here." />
    );

    const anchor = screen.getByRole("link", { name: "the docs" });
    expect(anchor).toHaveAttribute("href", "https://example.com/guide");
    expect(screen.queryByTitle("Click to preview")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Download")).not.toBeInTheDocument();
  });
});
