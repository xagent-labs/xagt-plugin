//
//  Automation.swift
//  SandboxedDashboard
//
//  Models for mission automation APIs.
//

import Foundation

struct Automation: Codable, Identifiable {
    let id: String
    let missionId: String
    let commandSource: AutomationCommandSource
    let trigger: AutomationTrigger
    let variables: [String: String]
    var active: Bool
    let createdAt: String
    let lastTriggeredAt: String?
    let stopPolicy: AutomationStopPolicy?
    let freshSession: AutomationFreshSession?
    let retryConfig: AutomationRetryConfig?

    enum CodingKeys: String, CodingKey {
        case id
        case missionId = "mission_id"
        case commandSource = "command_source"
        case trigger
        case variables
        case active
        case createdAt = "created_at"
        case lastTriggeredAt = "last_triggered_at"
        case stopPolicy = "stop_policy"
        case freshSession = "fresh_session"
        case retryConfig = "retry_config"
    }

    var triggerLabel: String {
        switch trigger {
        case .interval(let seconds):
            if seconds % 60 == 0 {
                return "Every \(seconds / 60)m"
            }
            return "Every \(seconds)s"
        case .agentFinished:
            return "After each turn"
        case .webhook:
            return "Webhook"
        }
    }

    var commandPreview: String {
        switch commandSource {
        case .inline(let content):
            let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? "(empty command)" : String(trimmed.prefix(80))
        case .library(let name):
            return "Library: \(name)"
        case .localFile(let path):
            return "File: \(path)"
        }
    }
}

enum AutomationStopPolicy: Codable {
    case never
    case whenFailingConsecutively(count: Int)
    case whenAllIssuesClosedAndPRsMerged(repo: String)
    case legacyOnConsecutiveFailures(count: Int)

    private enum CodingKeys: String, CodingKey {
        case type
        case count
        case repo
    }

    private enum StopPolicyType: String, Codable {
        case never
        case whenFailingConsecutively = "when_failing_consecutively"
        case whenAllIssuesClosedAndPRsMerged = "when_all_issues_closed_and_prs_merged"
        case legacyOnConsecutiveFailures = "on_consecutive_failures"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(StopPolicyType.self, forKey: .type)
        switch type {
        case .never:
            self = .never
        case .whenFailingConsecutively:
            self = .whenFailingConsecutively(count: try container.decode(Int.self, forKey: .count))
        case .whenAllIssuesClosedAndPRsMerged:
            self = .whenAllIssuesClosedAndPRsMerged(repo: try container.decode(String.self, forKey: .repo))
        case .legacyOnConsecutiveFailures:
            self = .legacyOnConsecutiveFailures(count: try container.decode(Int.self, forKey: .count))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .never:
            try container.encode(StopPolicyType.never, forKey: .type)
        case .whenFailingConsecutively(let count):
            try container.encode(StopPolicyType.whenFailingConsecutively, forKey: .type)
            try container.encode(count, forKey: .count)
        case .whenAllIssuesClosedAndPRsMerged(let repo):
            try container.encode(StopPolicyType.whenAllIssuesClosedAndPRsMerged, forKey: .type)
            try container.encode(repo, forKey: .repo)
        case .legacyOnConsecutiveFailures(let count):
            try container.encode(StopPolicyType.legacyOnConsecutiveFailures, forKey: .type)
            try container.encode(count, forKey: .count)
        }
    }
}

enum AutomationFreshSession: String, Codable {
    case always
    case keep
    case switchSession = "switch"
}

struct AutomationRetryConfig: Codable {
    let maxRetries: Int
    let retryDelaySeconds: Int
    let backoffMultiplier: Double

    enum CodingKeys: String, CodingKey {
        case maxRetries = "max_retries"
        case retryDelaySeconds = "retry_delay_seconds"
        case backoffMultiplier = "backoff_multiplier"
    }
}

enum AutomationCommandSource: Codable {
    case inline(content: String)
    case library(name: String)
    case localFile(path: String)

    private enum CodingKeys: String, CodingKey {
        case type
        case content
        case name
        case path
    }

    private enum SourceType: String, Codable {
        case inline
        case library
        case localFile = "local_file"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(SourceType.self, forKey: .type)
        switch type {
        case .inline:
            self = .inline(content: try container.decode(String.self, forKey: .content))
        case .library:
            self = .library(name: try container.decode(String.self, forKey: .name))
        case .localFile:
            self = .localFile(path: try container.decode(String.self, forKey: .path))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .inline(let content):
            try container.encode(SourceType.inline, forKey: .type)
            try container.encode(content, forKey: .content)
        case .library(let name):
            try container.encode(SourceType.library, forKey: .type)
            try container.encode(name, forKey: .name)
        case .localFile(let path):
            try container.encode(SourceType.localFile, forKey: .type)
            try container.encode(path, forKey: .path)
        }
    }
}

enum AutomationTrigger: Codable {
    case interval(seconds: Int)
    case agentFinished
    case webhook

    private enum CodingKeys: String, CodingKey {
        case type
        case seconds
    }

    private enum TriggerType: String, Codable {
        case interval
        case agentFinished = "agent_finished"
        case webhook
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(TriggerType.self, forKey: .type)
        switch type {
        case .interval:
            self = .interval(seconds: try container.decode(Int.self, forKey: .seconds))
        case .agentFinished:
            self = .agentFinished
        case .webhook:
            self = .webhook
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .interval(let seconds):
            try container.encode(TriggerType.interval, forKey: .type)
            try container.encode(seconds, forKey: .seconds)
        case .agentFinished:
            try container.encode(TriggerType.agentFinished, forKey: .type)
        case .webhook:
            try container.encode(TriggerType.webhook, forKey: .type)
        }
    }
}

struct CreateAutomationRequest: Encodable {
    let commandSource: AutomationCommandSource
    let trigger: AutomationTrigger
    let variables: [String: String]
    let startImmediately: Bool
    var stopPolicy: AutomationStopPolicy? = nil
    var freshSession: AutomationFreshSession? = nil

    enum CodingKeys: String, CodingKey {
        case commandSource = "command_source"
        case trigger
        case variables
        case startImmediately = "start_immediately"
        case stopPolicy = "stop_policy"
        case freshSession = "fresh_session"
    }
}

struct UpdateAutomationRequest: Encodable {
    let commandSource: AutomationCommandSource?
    let trigger: AutomationTrigger?
    let variables: [String: String]?
    let active: Bool?
    var stopPolicy: AutomationStopPolicy? = nil
    var freshSession: AutomationFreshSession? = nil

    enum CodingKeys: String, CodingKey {
        case commandSource = "command_source"
        case trigger
        case variables
        case active
        case stopPolicy = "stop_policy"
        case freshSession = "fresh_session"
    }
}
