import { describe, expect, it } from "vitest";
import { isStreamContinuation, mergeStreamFragment } from "../stream-continuation";

describe("isStreamContinuation", () => {
  it("treats empty strings as continuation", () => {
    expect(isStreamContinuation("", "abc")).toBe(true);
    expect(isStreamContinuation("abc", "")).toBe(true);
    expect(isStreamContinuation("", "")).toBe(true);
  });

  it("accepts strict prefix in either direction", () => {
    expect(isStreamContinuation("Hello", "Hello world")).toBe(true);
    expect(isStreamContinuation("Hello world", "Hello")).toBe(true);
  });

  it("absorbs trailing punctuation drift", () => {
    // grok thinking stream often re-emits the same buffer with a trailing
    // period that the previous chunk didn't have.
    expect(isStreamContinuation("Still active", "Still active.")).toBe(true);
    expect(isStreamContinuation("Still active.", "Still active")).toBe(true);
    expect(isStreamContinuation("No new CI", "No new CI…")).toBe(true);
  });

  it("absorbs trailing whitespace drift", () => {
    expect(isStreamContinuation("Hello", "Hello ")).toBe(true);
    expect(isStreamContinuation("Hello\n", "Hello")).toBe(true);
  });

  it("accepts short tail differences", () => {
    // X → X. → X. — small tail wobble within the tolerance window.
    expect(isStreamContinuation("Done", "Done!")).toBe(true);
  });

  it("rejects unrelated buffers", () => {
    expect(isStreamContinuation("Hello world", "Goodbye world")).toBe(false);
    expect(
      isStreamContinuation("Reasoning about A", "Reasoning about B")
    ).toBe(false);
  });

  it("rejects long divergent tails", () => {
    // If the shorter side does not match the longer side up to the tail
    // tolerance, this is a new bubble, not a continuation.
    expect(
      isStreamContinuation(
        "The user wants to know about A",
        "The user wants to know about A, then asks about B"
      )
    ).toBe(true); // strict prefix
    expect(
      isStreamContinuation(
        "Reasoning about A",
        "Reasoning about completely different topic"
      )
    ).toBe(false);
  });
});

describe("mergeStreamFragment", () => {
  it("accepts cumulative snapshots", () => {
    expect(mergeStreamFragment("Hello", "Hello world")).toBe("Hello world");
  });

  it("appends incremental fragments with overlap", () => {
    expect(mergeStreamFragment("No, it is not actually enforced yet.", "\n\nCurrent state:")).toBe(
      "No, it is not actually enforced yet.\n\nCurrent state:",
    );
    expect(mergeStreamFragment("I am going", "going to fix it")).toBe(
      "I am going to fix it",
    );
  });

  it("ignores replayed shorter prefixes", () => {
    expect(
      mergeStreamFragment(
        "The docs are accurate about this current state.",
        "The docs are accurate",
      ),
    ).toBe("The docs are accurate about this current state.");
  });
});
