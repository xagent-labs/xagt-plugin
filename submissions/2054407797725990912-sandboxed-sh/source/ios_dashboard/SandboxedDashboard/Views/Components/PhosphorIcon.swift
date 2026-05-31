//
//  PhosphorIcon.swift
//  SandboxedDashboard
//
//  Small adapter around the vendored Phosphor SVG assets so the app can mix
//  Phosphor icons with existing SF Symbols while migration stays explicit.
//

import SwiftUI

enum PhosphorIconWeight: String {
    case regular
    case light
    case bold
    case fill
}

enum PhosphorSymbol {
    case arrowRight
    case arrowsClockwise
    case brain
    case checkCircle
    case clock
    case handWaving
    case moon
    case pauseCircle
    case prohibit
    case hardDrives
    case signIn
    case warning
    case wifiHigh
    case wifiSlash
    case xCircle

    var baseName: String {
        switch self {
        case .arrowRight: return "arrow-right"
        case .arrowsClockwise: return "arrows-clockwise"
        case .brain: return "brain"
        case .checkCircle: return "check-circle"
        case .clock: return "clock"
        case .handWaving: return "hand-waving"
        case .moon: return "moon"
        case .pauseCircle: return "pause-circle"
        case .prohibit: return "prohibit"
        case .hardDrives: return "hard-drives"
        case .signIn: return "sign-in"
        case .warning: return "warning"
        case .wifiHigh: return "wifi-high"
        case .wifiSlash: return "wifi-slash"
        case .xCircle: return "x-circle"
        }
    }

    func assetName(weight: PhosphorIconWeight) -> String {
        switch weight {
        case .regular:
            return baseName
        case .light, .bold, .fill:
            return "\(baseName)-\(weight.rawValue)"
        }
    }
}

struct PhosphorIcon: View {
    let symbol: PhosphorSymbol
    var weight: PhosphorIconWeight = .regular
    var color: Color? = nil

    @ViewBuilder
    var body: some View {
        let image = Image(symbol.assetName(weight: weight))
            .renderingMode(.template)
            .resizable()
            .aspectRatio(contentMode: .fit)

        if let color {
            image.foregroundStyle(color)
        } else {
            image
        }
    }
}
