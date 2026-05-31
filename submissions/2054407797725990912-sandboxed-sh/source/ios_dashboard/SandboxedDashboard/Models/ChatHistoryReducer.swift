//
//  ChatHistoryReducer.swift
//  SandboxedDashboard
//
//  Pure reducer for stored mission events -> chat messages.
//

import Foundation

enum ChatHistoryReducer {
    struct ReplayResult {
        let messages: [ChatMessage]
        let textOpBuffers: [String: String]
    }

    static func reduce(events: [StoredEvent], mission: Mission) -> [ChatMessage] {
        reduceWithState(events: events, mission: mission).messages
    }

    static func reduceWithState(events: [StoredEvent], mission: Mission) -> ReplayResult {
        var state = State(mission: mission)
        for event in ordered(events) {
            state.apply(event)
        }
        state.finalizeActiveToolCalls(withState: .success)
        return ReplayResult(messages: state.messages, textOpBuffers: state.textOpBuffers)
    }

    private static func ordered(_ events: [StoredEvent]) -> [StoredEvent] {
        events.sorted { lhs, rhs in
            if lhs.sequence != rhs.sequence { return lhs.sequence < rhs.sequence }
            if lhs.timestamp != rhs.timestamp { return lhs.timestamp < rhs.timestamp }
            return lhs.id < rhs.id
        }
    }

    private struct State {
        let mission: Mission
        var messages: [ChatMessage] = []
        var messageIds = Set<String>()
        var toolMessageIndexByCallId: [String: Int] = [:]
        var textOpBuffers: [String: String] = [:]
        private let streamingThoughtPrefix = "stream-thinking-"

        mutating func apply(_ event: StoredEvent) {
            var data = event.metadata.mapValues(\.value)
            data["mission_id"] = event.missionId
            data["content"] = event.content
            if let eventId = event.eventId { data["id"] = eventId }
            if let toolCallId = event.toolCallId { data["tool_call_id"] = toolCallId }
            if let toolName = event.toolName { data["name"] = toolName }
            if event.eventType == "text_op",
               let jsonData = event.content.data(using: .utf8),
               let ops = try? JSONSerialization.jsonObject(with: jsonData) {
                data["ops"] = ops
            }

            switch event.eventType {
            case "user_message":
                applyUser(data)
            case "assistant_message", "assistant_message_canonical":
                applyAssistant(data)
            case "thinking":
                applyThinking(data, fallbackId: "thinking-\(event.id)")
            case "text_op":
                applyTextOp(data)
            case "agent_phase":
                applyPhase(data, fallbackId: "phase-\(event.id)")
            case "tool_call":
                applyToolCall(data)
            case "tool_result":
                applyToolResult(data)
            default:
                break
            }
        }

        private mutating func append(_ message: ChatMessage) {
            guard !messageIds.contains(message.id) else { return }
            messageIds.insert(message.id)
            messages.append(message)
        }

        private mutating func removePhaseMessages() {
            messages.removeAll { message in
                guard message.isPhase else { return false }
                messageIds.remove(message.id)
                return true
            }
            rebuildToolIndex()
        }

        private mutating func rebuildToolIndex() {
            toolMessageIndexByCallId.removeAll(keepingCapacity: true)
            for (index, message) in messages.enumerated() where message.isToolCall {
                let key = message.toolData?.toolCallId ?? message.id.replacingOccurrences(of: "tool-", with: "")
                toolMessageIndexByCallId[key] = index
            }
        }

        private mutating func finalizeActiveThinkingMessages() {
            for index in messages.indices where messages[index].isThinking && !messages[index].thinkingDone {
                let existing = messages[index]
                messages[index] = ChatMessage(
                    id: existing.id,
                    type: .thinking(done: true, startTime: existing.thinkingStartTime ?? existing.timestamp),
                    content: existing.content,
                    toolUI: existing.toolUI,
                    toolData: existing.toolData,
                    timestamp: existing.timestamp
                )
            }
        }

        mutating func finalizeActiveToolCalls(withState state: ToolCallState) {
            for index in messages.indices where messages[index].isToolCall && messages[index].isActiveToolCall {
                guard var toolData = messages[index].toolData else { continue }
                toolData.endTime = toolData.endTime ?? messages[index].timestamp
                if toolData.result == nil || state == .cancelled {
                    toolData.state = state
                }
                messages[index] = ChatMessage(
                    id: messages[index].id,
                    type: .toolCall(name: toolData.name, isActive: false),
                    content: messages[index].content,
                    toolData: toolData,
                    timestamp: messages[index].timestamp
                )
            }
        }

        private mutating func applyUser(_ data: [String: Any]) {
            guard let id = data["id"] as? String else { return }
            let content = data["content"] as? String ?? ""
            if let index = messages.firstIndex(where: { $0.id == id }) {
                messages[index].sendState = .sent
                messages[index].content = content
            } else {
                finalizeActiveThinkingMessages()
                append(ChatMessage(id: id, type: .user, content: content))
            }
        }

        private mutating func applyAssistant(_ data: [String: Any]) {
            guard let id = data["id"] as? String, !messageIds.contains(id) else { return }
            finalizeActiveThinkingMessages()
            removePhaseMessages()
            finalizeActiveToolCalls(withState: .success)

            let success = data["success"] as? Bool ?? true
            let costObj = data["cost"] as? [String: Any]
            let costCents = data["cost_cents"] as? Int
                ?? costObj?["amount_cents"] as? Int
                ?? 0
            let costSource = (data["cost_source"] as? String ?? costObj?["source"] as? String)
                .flatMap(CostSource.init(rawValue:)) ?? .unknown
            let model = data["model"] as? String
            append(
                ChatMessage(
                    id: id,
                    type: .assistant(
                        success: success,
                        costCents: costCents,
                        costSource: costSource,
                        model: model,
                        sharedFiles: parseSharedFiles(data["shared_files"])
                    ),
                    content: data["content"] as? String ?? ""
                )
            )
        }

        private func parseSharedFiles(_ value: Any?) -> [SharedFile]? {
            guard let filesArray = value as? [[String: Any]] else { return nil }
            return filesArray.compactMap { fileData in
                guard let name = fileData["name"] as? String,
                      let url = fileData["url"] as? String,
                      let contentType = fileData["content_type"] as? String,
                      let kindString = fileData["kind"] as? String,
                      let kind = SharedFileKind(rawValue: kindString) else {
                    return nil
                }
                return SharedFile(
                    name: name,
                    url: url,
                    contentType: contentType,
                    sizeBytes: fileData["size_bytes"] as? Int,
                    kind: kind
                )
            }
        }

        private mutating func applyThinking(_ data: [String: Any], fallbackId: String) {
            let content = data["content"] as? String ?? ""
            let done = data["done"] as? Bool ?? false
            guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                if done { finalizeActiveThinkingMessages() }
                return
            }

            if done, data["goal_role"] as? String == "deliverable", mission.goalMode {
                let baseId = data["id"] as? String ?? fallbackId
                let id = "goal-deliverable-\(baseId)"
                guard !messageIds.contains(id) else { return }
                finalizeActiveThinkingMessages()
                removePhaseMessages()
                append(
                    ChatMessage(
                        id: id,
                        type: .assistant(success: true, costCents: 0, costSource: .unknown, model: nil, sharedFiles: nil),
                        content: content
                    )
                )
                return
            }

            if let id = data["id"] as? String, messageIds.contains(id) { return }
            removePhaseMessages()

            if let index = messages.lastIndex(where: { $0.isThinking && !$0.thinkingDone }) {
                let existing = messages[index]
                messages[index] = ChatMessage(
                    id: existing.id,
                    type: .thinking(done: done, startTime: existing.thinkingStartTime ?? existing.timestamp),
                    content: content,
                    toolUI: existing.toolUI,
                    toolData: existing.toolData,
                    timestamp: existing.timestamp
                )
            } else {
                append(
                    ChatMessage(
                        id: data["id"] as? String ?? fallbackId,
                        type: .thinking(done: done, startTime: Date()),
                        content: content
                    )
                )
            }
        }

        private mutating func applyTextOp(_ data: [String: Any]) {
            let bubbleId = data["bubble_id"] as? String ?? "text-op-latest"
            let ops = data["ops"] as? [[String: Any]] ?? []
            var content = textOpBuffers[bubbleId] ?? ""
            var finalized = false

            for op in ops {
                switch op["type"] as? String {
                case "insert":
                    let pos = min(max(op["pos"] as? Int ?? content.count, 0), content.count)
                    let index = content.index(content.startIndex, offsetBy: pos)
                    content.insert(contentsOf: op["text"] as? String ?? "", at: index)
                case "replace":
                    let range = op["range"] as? [Int] ?? []
                    let start = min(max(range.first ?? 0, 0), content.count)
                    let end = min(max(range.dropFirst().first ?? content.count, start), content.count)
                    let startIndex = content.index(content.startIndex, offsetBy: start)
                    let endIndex = content.index(content.startIndex, offsetBy: end)
                    content.replaceSubrange(startIndex..<endIndex, with: op["text"] as? String ?? "")
                case "finalize":
                    finalized = true
                default:
                    continue
                }
            }

            textOpBuffers[bubbleId] = finalized ? nil : content
            guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
            removePhaseMessages()

            if let activeRealThought = messages.last(where: {
                $0.isThinking && !$0.thinkingDone && !$0.id.hasPrefix(streamingThoughtPrefix)
            }), !activeRealThought.content.isEmpty {
                return
            }

            let id = "\(streamingThoughtPrefix)\(bubbleId)"
            if let index = messages.lastIndex(where: { $0.isThinking && !$0.thinkingDone && $0.id == id }) {
                messages[index] = ChatMessage(
                    id: id,
                    type: .thinking(done: finalized, startTime: messages[index].thinkingStartTime ?? messages[index].timestamp),
                    content: content,
                    timestamp: messages[index].timestamp
                )
            } else if !messageIds.contains(id) {
                append(ChatMessage(id: id, type: .thinking(done: finalized, startTime: Date()), content: content))
            }
        }

        private mutating func applyPhase(_ data: [String: Any], fallbackId: String) {
            removePhaseMessages()
            append(
                ChatMessage(
                    id: fallbackId,
                    type: .phase(
                        phase: data["phase"] as? String ?? "",
                        detail: data["detail"] as? String,
                        agent: data["agent"] as? String
                    ),
                    content: ""
                )
            )
        }

        private mutating func applyToolCall(_ data: [String: Any]) {
            guard let toolCallId = data["tool_call_id"] as? String,
                  let name = data["name"] as? String,
                  let args = data["args"] as? [String: Any],
                  !messageIds.contains(toolCallId),
                  !messageIds.contains("tool-\(toolCallId)") else { return }

            finalizeActiveThinkingMessages()
            if let toolUI = ToolUIContent.parse(name: name, args: args) {
                append(ChatMessage(id: toolCallId, type: .toolUI(name: name), content: "", toolUI: toolUI))
                return
            }

            finalizeActiveToolCalls(withState: .success)
            let message = ChatMessage(
                id: "tool-\(toolCallId)",
                type: .toolCall(name: name, isActive: true),
                content: "",
                toolData: ToolCallData(
                    toolCallId: toolCallId,
                    name: name,
                    args: args,
                    startTime: Date(),
                    endTime: nil,
                    result: nil,
                    state: .running
                )
            )
            toolMessageIndexByCallId[toolCallId] = messages.count
            append(message)
        }

        private mutating func applyToolResult(_ data: [String: Any]) {
            guard let toolCallId = data["tool_call_id"] as? String,
                  let index = toolMessageIndexByCallId[toolCallId],
                  messages.indices.contains(index),
                  var toolData = messages[index].toolData else { return }

            let result = data["result"]
            toolData.endTime = Date()
            toolData.result = result
            if let resultDict = result as? [String: Any],
               resultDict["status"] as? String == "cancelled" {
                toolData.state = .cancelled
            } else if toolData.isErrorResult {
                toolData.state = .error
            } else {
                toolData.state = .success
            }

            messages[index] = ChatMessage(
                id: messages[index].id,
                type: .toolCall(name: toolData.name, isActive: false),
                content: messages[index].content,
                toolData: toolData,
                timestamp: messages[index].timestamp
            )
        }
    }
}
