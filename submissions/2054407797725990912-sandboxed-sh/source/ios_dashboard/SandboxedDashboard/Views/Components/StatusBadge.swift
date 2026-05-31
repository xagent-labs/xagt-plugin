//
//  StatusBadge.swift
//  SandboxedDashboard
//
//  Status indicator badges with semantic colors
//

import SwiftUI

enum StatusType {
    case pending
    case running
    case active
    case awaitingUser
    case completed
    case failed
    case cancelled
    case idle
    case error
    case connected
    case disconnected
    case connecting
    case interrupted
    case blocked

    var color: Color {
        switch self {
        case .pending:
            return Theme.warning
        case .idle:
            return Theme.textMuted
        case .running, .active, .connecting:
            return Theme.accent
        case .awaitingUser:
            return Theme.info
        case .completed, .connected:
            return Theme.success
        case .failed, .error, .interrupted, .blocked:
            return Theme.error
        case .cancelled, .disconnected:
            return Theme.textTertiary
        }
    }

    var backgroundColor: Color {
        color.opacity(0.15)
    }

    var label: String {
        switch self {
        case .pending: return "Pending"
        case .running: return "Running"
        case .active: return "Active"
        case .awaitingUser: return "Needs You"
        case .completed: return "Completed"
        case .failed: return "Failed"
        case .cancelled: return "Cancelled"
        case .idle: return "Idle"
        case .error: return "Error"
        case .connected: return "Connected"
        case .disconnected: return "Disconnected"
        case .connecting: return "Connecting"
        case .interrupted: return "Interrupted"
        case .blocked: return "Blocked"
        }
    }

    var phosphorIcon: PhosphorSymbol {
        switch self {
        case .pending: return .clock
        case .running, .connecting: return .arrowsClockwise
        case .active: return .arrowsClockwise
        case .awaitingUser: return .handWaving
        case .completed: return .checkCircle
        case .failed, .error: return .xCircle
        case .cancelled: return .prohibit
        case .idle: return .moon
        case .connected: return .wifiHigh
        case .disconnected: return .wifiSlash
        case .interrupted: return .pauseCircle
        case .blocked: return .warning
        }
    }

    var phosphorWeight: PhosphorIconWeight {
        switch self {
        case .completed, .failed, .error, .interrupted, .blocked:
            return .fill
        default:
            return .regular
        }
    }

    var shouldPulse: Bool {
        switch self {
        case .running, .active, .connecting:
            return true
        default:
            return false
        }
    }
}

struct StatusBadge: View {
    let status: StatusType
    var showIcon: Bool = true
    var compact: Bool = false
    
    var body: some View {
        HStack(spacing: compact ? 4 : 6) {
            if showIcon {
                PhosphorIcon(symbol: status.phosphorIcon, weight: status.phosphorWeight, color: status.color)
                    .frame(width: compact ? 10 : 12, height: compact ? 10 : 12)
                    .symbolEffect(.pulse, options: status.shouldPulse ? .repeating : .nonRepeating)
            }
            Text(status.label)
                .font(.system(size: compact ? 10 : 11, weight: .semibold))
                .textCase(.uppercase)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
        }
        .foregroundStyle(status.color)
        .padding(.horizontal, compact ? 8 : 10)
        .padding(.vertical, compact ? 4 : 6)
        .background(status.backgroundColor)
        .clipShape(Capsule())
        .fixedSize()
    }
}

struct StatusDot: View {
    let status: StatusType
    var size: CGFloat = 8
    
    var body: some View {
        Circle()
            .fill(status.color)
            .frame(width: size, height: size)
            .overlay {
                if status.shouldPulse {
                    Circle()
                        .stroke(status.color.opacity(0.5), lineWidth: 2)
                        .scaleEffect(1.5)
                        .opacity(0.5)
                }
            }
    }
}

/// A wrapper view that displays a WorkspaceStatus as a StatusBadge
struct WorkspaceStatusBadge: View {
    let status: WorkspaceStatus
    var showIcon: Bool = true
    var compact: Bool = false

    private var statusType: StatusType {
        switch status {
        case .pending: return .pending
        case .building: return .running
        case .ready: return .completed
        case .error: return .error
        }
    }

    var body: some View {
        StatusBadge(status: statusType, showIcon: showIcon, compact: compact)
    }
}

#Preview {
    VStack(spacing: 16) {
        HStack(spacing: 8) {
            StatusBadge(status: .pending)
            StatusBadge(status: .running)
            StatusBadge(status: .completed)
        }

        HStack(spacing: 8) {
            StatusBadge(status: .failed)
            StatusBadge(status: .cancelled)
            StatusBadge(status: .active)
        }

        HStack(spacing: 8) {
            StatusBadge(status: .connected, compact: true)
            StatusBadge(status: .disconnected, compact: true)
            StatusBadge(status: .connecting, compact: true)
        }

        Divider()

        HStack(spacing: 16) {
            ForEach([StatusType.active, .completed, .failed, .idle], id: \.label) { status in
                StatusDot(status: status)
            }
        }
    }
    .padding()
    .background(Theme.backgroundPrimary)
}
