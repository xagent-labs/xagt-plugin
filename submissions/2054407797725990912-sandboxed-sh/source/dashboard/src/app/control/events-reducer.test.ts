import { describe, expect, it } from "vitest";

import fixtures from "../../../../shared/control-reducer-fixtures.json";
import type { Mission, StoredEvent } from "@/lib/api";
import { eventsToItemsImpl, type ChatItem } from "./events-reducer";

type ExpectedItem = Partial<ChatItem> & { kind: ChatItem["kind"] };

function storedEvent(
  sequence: number,
  event_type: string,
  content: string,
  timestamp = `2026-05-28T10:00:${String(sequence).padStart(2, "0")}Z`,
  metadata: Record<string, unknown> = {},
): StoredEvent {
  return {
    id: sequence,
    mission_id: "mission-1",
    sequence,
    event_type,
    timestamp,
    content,
    metadata,
  };
}

function expectItemsContain(items: ChatItem[], expected: ExpectedItem[]) {
  for (const expectedItem of expected) {
    expect(items).toEqual(
      expect.arrayContaining([expect.objectContaining(expectedItem)]),
    );
  }
}

describe("eventsToItemsImpl shared reducer fixtures", () => {
  for (const fixtureCase of fixtures.cases) {
    it(fixtureCase.name, () => {
      const items = eventsToItemsImpl(
        fixtureCase.events as StoredEvent[],
        fixtures.mission as Mission,
      );
      expectItemsContain(items, fixtureCase.expected as ExpectedItem[]);

      if (fixtureCase.name === "duplicate event ids") {
        expect(items.filter((item) => item.kind === "assistant")).toHaveLength(
          1,
        );
      }
      if (fixtureCase.name === "goal deliverable inference") {
        expect(items.filter((item) => item.kind === "thinking")).toHaveLength(
          0,
        );
      }
    });
  }
});

describe("eventsToItemsImpl text_delta replay", () => {
  it("keeps a completed non-duplicate stream draft after an assistant reply", () => {
    const items = eventsToItemsImpl(
      [
        storedEvent(
          1,
          "text_delta",
          "I checked the failing run and found the artifact script path issue.",
        ),
        storedEvent(2, "assistant_message", "Fixed and pushed the branch.", undefined, {
          success: true,
        }),
      ],
      { status: "awaiting_user" } as Mission,
    );

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "stream",
          content:
            "I checked the failing run and found the artifact script path issue.",
          done: true,
        }),
      ]),
    );
  });

  it("drops a stream draft that duplicates the final assistant reply", () => {
    const answer =
      "Fixed and pushed the branch after updating the artifact script path.";
    const items = eventsToItemsImpl(
      [
        storedEvent(1, "text_delta", answer),
        storedEvent(2, "assistant_message", answer, undefined, {
          success: true,
        }),
      ],
      { status: "awaiting_user" } as Mission,
    );

    expect(items.filter((item) => item.kind === "stream")).toHaveLength(0);
  });
});
