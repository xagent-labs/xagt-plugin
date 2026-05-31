import { describe, expect, it } from "vitest";

import {
  appendUnpersistedLiveTail,
  deriveItemViews,
  type ChatItem,
} from "./control-client";

const streamItem: Extract<ChatItem, { kind: "stream" }> = {
  id: "text_delta_latest",
  kind: "stream",
  content: "Visible assistant draft",
  done: false,
  startTime: 1,
};

const thinkingItem: Extract<ChatItem, { kind: "thinking" }> = {
  id: "thinking-1",
  kind: "thinking",
  content: "Typed provider reasoning",
  done: false,
  startTime: 1,
};

const assistantItem: Extract<ChatItem, { kind: "assistant" }> = {
  id: "assistant-1",
  kind: "assistant",
  content: "Final answer",
  success: true,
  costCents: 0,
  costSource: "unknown",
  model: null,
  timestamp: 2,
};

describe("deriveItemViews", () => {
  it("routes text_delta stream rows to the side panel when open", () => {
    const views = deriveItemViews([streamItem], true);

    expect(views.thinkingItems).toEqual([streamItem]);
    expect(views.thinkingItemsCount).toBe(0);
    expect(views.hasActiveThinking).toBe(false);
    expect(views.groupedItems).toEqual([]);
  });

  it("keeps a completed terminal draft visible inline when the side panel is open", () => {
    const completedStream: Extract<ChatItem, { kind: "stream" }> = {
      ...streamItem,
      done: true,
      endTime: 3,
    };

    const views = deriveItemViews([completedStream], true, false);

    expect(views.thinkingItems).toEqual([completedStream]);
    expect(views.groupedItems).toEqual([
      {
        kind: "thinking_group",
        groupId: completedStream.id,
        thoughts: [completedStream],
      },
    ]);
  });

  it("routes a completed draft to the side panel when an assistant reply follows it", () => {
    const completedStream: Extract<ChatItem, { kind: "stream" }> = {
      ...streamItem,
      done: true,
      endTime: 3,
    };

    const views = deriveItemViews([completedStream, assistantItem], true, false);

    expect(views.thinkingItems).toEqual([completedStream]);
    expect(views.groupedItems).toEqual([assistantItem]);
  });

  it("routes real thinking rows to the side panel when open", () => {
    const views = deriveItemViews([streamItem, thinkingItem], true);

    expect(views.thinkingItems).toEqual([streamItem, thinkingItem]);
    expect(views.thinkingItemsCount).toBe(1);
    expect(views.hasActiveThinking).toBe(true);
    expect(views.groupedItems).toEqual([]);
  });

  it("does not drop a real thought when a stream row has matching text", () => {
    const matchingStream: Extract<ChatItem, { kind: "stream" }> = {
      ...streamItem,
      content: thinkingItem.content,
    };

    const views = deriveItemViews([thinkingItem, matchingStream], true);

    expect(views.thinkingItems).toEqual([thinkingItem, matchingStream]);
    expect(views.thinkingItemsCount).toBe(1);
    expect(views.groupedItems).toEqual([]);
  });

  it("keeps thinking and stream rows inline when the side panel is closed", () => {
    const views = deriveItemViews([streamItem, thinkingItem], false);

    expect(views.thinkingItems).toEqual([thinkingItem]);
    expect(views.groupedItems).toEqual([
      {
        kind: "thinking_group",
        groupId: streamItem.id,
        thoughts: [streamItem, thinkingItem],
      },
    ]);
  });

  it("does not render completed thoughts after the final assistant row inline", () => {
    const completedThinking: Extract<ChatItem, { kind: "thinking" }> = {
      ...thinkingItem,
      done: true,
      endTime: 3,
    };

    const views = deriveItemViews([assistantItem, completedThinking], false);

    expect(views.thinkingItems).toEqual([completedThinking]);
    expect(views.groupedItems).toEqual([assistantItem]);
  });

  it("renders late completed tool rows before the final assistant row", () => {
    const toolItem: Extract<ChatItem, { kind: "tool" }> = {
      id: "tool-call-1",
      kind: "tool",
      toolCallId: "call-1",
      name: "bash",
      args: { command: "true" },
      result: { output: "" },
      isUiTool: false,
      startTime: 1,
      endTime: 2,
    };

    const views = deriveItemViews([assistantItem, toolItem], false, false);

    expect(views.groupedItems).toEqual([toolItem, assistantItem]);
  });

  it("keeps completed thoughts of a new turn inline while the mission runs", () => {
    // A continued mission / goal-mode iteration: the previous turn's reply is
    // now the "last assistant", but the freshly completed thought belongs to
    // the in-progress turn and must stay visible inline (panel closed).
    const completedThinking: Extract<ChatItem, { kind: "thinking" }> = {
      ...thinkingItem,
      done: true,
      endTime: 3,
    };

    const views = deriveItemViews(
      [assistantItem, completedThinking],
      false,
      true,
    );

    expect(views.groupedItems).toEqual([
      assistantItem,
      {
        kind: "thinking_group",
        groupId: completedThinking.id,
        thoughts: [completedThinking],
      },
    ]);
  });

  it("keeps active streams after the final assistant row visible inline", () => {
    const views = deriveItemViews([assistantItem, streamItem], false);

    expect(views.groupedItems).toEqual([
      assistantItem,
      {
        kind: "thinking_group",
        groupId: streamItem.id,
        thoughts: [streamItem],
      },
    ]);
  });
});

describe("appendUnpersistedLiveTail", () => {
  const userItem: Extract<ChatItem, { kind: "user" }> = {
    id: "user-1",
    kind: "user",
    content: "Start",
    timestamp: 1,
  };
  it("does not append a stale live stream after a persisted assistant reply", () => {
    const views = appendUnpersistedLiveTail(
      [userItem, assistantItem],
      [userItem, streamItem],
    );

    expect(views).toEqual([userItem, assistantItem]);
  });

  it("does not append a live stream whose content already persisted as assistant", () => {
    const matchingStream: Extract<ChatItem, { kind: "stream" }> = {
      ...streamItem,
      content: assistantItem.content,
    };

    const views = appendUnpersistedLiveTail(
      [userItem, assistantItem],
      [userItem, matchingStream],
    );

    expect(views).toEqual([userItem, assistantItem]);
  });

  it("keeps a genuine live stream when no persisted assistant has arrived", () => {
    const views = appendUnpersistedLiveTail([userItem], [userItem, streamItem]);

    expect(views).toEqual([userItem, streamItem]);
  });
});
