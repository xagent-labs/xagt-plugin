//
//  SlashCommandSuggestions.swift
//  SandboxedDashboard
//
//  Lightweight popover surfaced above the chat composer when the user types
//  a leading `/`. Surfaces backend-specific built-in commands (e.g. codex
//  `/goal <objective>`) fetched from `/api/library/builtin-commands`.
//

import SwiftUI

/// View that renders matching slash commands for the current backend.
/// Closes itself when the binding's filter is empty (caller should
/// gate visibility with `if isPresented` themselves).
struct SlashCommandSuggestions: View {
    /// Visible commands, already filtered by name prefix.
    let commands: [SlashCommand]
    /// Tap → caller should rewrite the input to "/<name> ".
    let onSelect: (SlashCommand) -> Void

    var body: some View {
        if commands.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(commands) { cmd in
                    Button {
                        onSelect(cmd)
                        HapticService.lightTap()
                    } label: {
                        SlashCommandRow(command: cmd)
                    }
                    .buttonStyle(.plain)

                    if cmd.id != commands.last?.id {
                        Divider()
                            .background(Theme.border)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Theme.border, lineWidth: 0.5)
            )
            .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}

private struct SlashCommandRow: View {
    let command: SlashCommand

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text("/\(command.name)")
                .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                .foregroundStyle(Theme.accent)
                .frame(minWidth: 70, alignment: .leading)

            VStack(alignment: .leading, spacing: 2) {
                if let description = command.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)
                        .lineLimit(2)
                }
                if !command.params.isEmpty {
                    Text(commandHint(command: command))
                        .font(.caption2.monospaced())
                        .foregroundStyle(Theme.textTertiary)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }

    /// Render a one-line synopsis like `/goal <objective>` (required params
    /// bracketed, optional with `?`).
    private func commandHint(command: SlashCommand) -> String {
        var parts: [String] = ["/\(command.name)"]
        for param in command.params {
            if param.required {
                parts.append("<\(param.name)>")
            } else {
                parts.append("[\(param.name)]")
            }
        }
        return parts.joined(separator: " ")
    }
}

// MARK: - Helpers

extension SlashCommand {
    /// Filter helper: returns true when the command name has the given
    /// prefix (case-insensitive).
    func matchesPrefix(_ prefix: String) -> Bool {
        if prefix.isEmpty { return true }
        return name.lowercased().hasPrefix(prefix.lowercased())
    }
}
