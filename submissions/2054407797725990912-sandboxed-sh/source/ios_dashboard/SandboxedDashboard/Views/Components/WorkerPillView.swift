//
//  WorkerPillView.swift
//  SandboxedDashboard
//
//  Floating pill showing worker count for boss missions.
//  Tapping opens the worker sheet.
//

import SwiftUI

struct WorkerPillView: View {
    let workers: [Mission]
    let runningWorkers: [RunningMissionInfo]
    let onTap: () -> Void

    private var activeCount: Int {
        workers.filter { m in
            m.status == .active || m.status == .pending || m.status == .blocked ||
            runningWorkers.contains { $0.missionId == m.id }
        }.count
    }

    private var completedCount: Int {
        workers.filter { $0.status == .completed }.count
    }

    private var failedCount: Int {
        workers.filter { $0.status == .failed || $0.status == .notFeasible || $0.status == .interrupted }.count
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                Image(systemName: "person.3.fill")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Theme.accent)

                Text("\(workers.count)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)

                if activeCount > 0 {
                    HStack(spacing: 3) {
                        Circle()
                            .fill(Theme.accent)
                            .frame(width: 5, height: 5)
                        Text("\(activeCount)")
                            .font(.system(size: 10, weight: .medium).monospaced())
                            .foregroundStyle(Theme.accent)
                    }
                }

                if completedCount > 0 {
                    HStack(spacing: 3) {
                        Circle()
                            .fill(Theme.success)
                            .frame(width: 5, height: 5)
                        Text("\(completedCount)")
                            .font(.system(size: 10, weight: .medium).monospaced())
                            .foregroundStyle(Theme.success)
                    }
                }

                if failedCount > 0 {
                    HStack(spacing: 3) {
                        Circle()
                            .fill(Theme.error)
                            .frame(width: 5, height: 5)
                        Text("\(failedCount)")
                            .font(.system(size: 10, weight: .medium).monospaced())
                            .foregroundStyle(Theme.error)
                    }
                }

                Image(systemName: "chevron.up")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Theme.textMuted)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(Theme.border, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
        }
        .buttonStyle(.plain)
    }
}
