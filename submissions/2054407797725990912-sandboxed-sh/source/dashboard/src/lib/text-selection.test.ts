import { describe, expect, it } from "vitest";

import { insertTextAtSelection } from "./text-selection";

describe("insertTextAtSelection", () => {
  it("inserts into an empty value", () => {
    const result = insertTextAtSelection("", "[Uploaded: ./context/a.png]", {
      start: 0,
      end: 0,
    });
    expect(result.value).toBe("[Uploaded: ./context/a.png]");
    expect(result.cursor).toBe(27);
  });

  it("inserts at cursor in the middle", () => {
    const result = insertTextAtSelection("hello world", "[Uploaded: file]", {
      start: 6,
      end: 6,
    });
    expect(result.value).toBe("hello [Uploaded: file]world");
    expect(result.cursor).toBe(22);
  });

  it("replaces selected text", () => {
    const result = insertTextAtSelection(
      "line one\nline two",
      "[Uploaded: x]",
      { start: 5, end: 13 },
    );
    expect(result.value).toBe("line [Uploaded: x] two");
    expect(result.cursor).toBe(18);
  });

  it("clamps out-of-range selection indices", () => {
    const result = insertTextAtSelection("abc", "X", { start: -5, end: 99 });
    expect(result.value).toBe("X");
    expect(result.cursor).toBe(1);
  });
});
