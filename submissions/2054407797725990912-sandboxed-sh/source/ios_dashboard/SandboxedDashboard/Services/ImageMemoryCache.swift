//
//  ImageMemoryCache.swift
//  SandboxedDashboard
//
//  Shared image cache/downsampler for chat image previews.
//

import Foundation
import ImageIO
import UIKit

@MainActor
final class ImageMemoryCache {
    static let shared = ImageMemoryCache()

    private final class Entry {
        let image: UIImage

        init(image: UIImage) {
            self.image = image
        }
    }

    private struct ImageBox: @unchecked Sendable {
        let image: UIImage
    }

    private let cache = NSCache<NSURL, Entry>()

    private init() {
        cache.countLimit = 120
        cache.totalCostLimit = 48 * 1_024 * 1_024
    }

    func cachedImage(for url: URL) -> UIImage? {
        cache.object(forKey: url as NSURL)?.image
    }

    func store(_ image: UIImage, for url: URL) {
        let pixels = Int(image.size.width * image.scale * image.size.height * image.scale)
        cache.setObject(Entry(image: image), forKey: url as NSURL, cost: pixels * 4)
    }

    func image(from data: Data, url: URL, maxPixelSize: CGFloat = 900) async -> UIImage? {
        if let cached = cachedImage(for: url) {
            return cached
        }

        let box = await Task.detached(priority: .userInitiated) {
            ImageBox(image: Self.downsample(data: data, maxPixelSize: maxPixelSize) ?? UIImage(data: data) ?? UIImage())
        }.value
        guard box.image.size != .zero else { return nil }
        store(box.image, for: url)
        return box.image
    }

    nonisolated private static func downsample(data: Data, maxPixelSize: CGFloat) -> UIImage? {
        let options: [CFString: Any] = [
            kCGImageSourceShouldCache: false
        ]
        guard let source = CGImageSourceCreateWithData(data as CFData, options as CFDictionary) else {
            return nil
        }

        let downsampleOptions: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixelSize
        ]
        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, downsampleOptions as CFDictionary) else {
            return nil
        }
        return UIImage(cgImage: cgImage)
    }
}
