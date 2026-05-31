import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent rich file links", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ exists: true, size: 42 }),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("renders local markdown file links as rich file cards", async () => {
    render(
      <MarkdownContent content="[plan.md](/workspaces/mission-fd475fe4/plan.md)" />,
    );

    expect(screen.queryByRole("link", { name: "plan.md" })).not.toBeInTheDocument();
    expect(screen.getByText("plan.md")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/fs/validate?path=%2Fworkspaces%2Fmission-fd475fe4%2Fplan.md",
        ),
        expect.any(Object),
      );
    });
  });

  test("keeps external markdown links as regular anchors", () => {
    render(<MarkdownContent content="[docs](https://example.com/docs)" />);

    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute(
      "href",
      "https://example.com/docs",
    );
  });
});
