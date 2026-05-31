import { describe, it, expect } from "vitest";
import {
  parseRichTags,
  stripRichFileTagsByName,
  transformRichTags,
  hasPartialRichTag,
} from "./rich-tags";

describe("parseRichTags", () => {
  it("parses an image tag", () => {
    const tags = parseRichTags('<image path="./chart.png" alt="Chart" />');
    expect(tags).toEqual([{ type: "image", path: "./chart.png", alt: "Chart", name: undefined }]);
  });

  it("parses a file tag", () => {
    const tags = parseRichTags('<file path="./report.pdf" name="Report" />');
    expect(tags).toEqual([{ type: "file", path: "./report.pdf", alt: undefined, name: "Report" }]);
  });

  it("parses multiple tags", () => {
    const content = 'Here is the chart:\n<image path="./a.png" />\nAnd the report:\n<file path="./b.pdf" name="B" />';
    const tags = parseRichTags(content);
    expect(tags).toHaveLength(2);
    expect(tags[0].type).toBe("image");
    expect(tags[0].path).toBe("./a.png");
    expect(tags[1].type).toBe("file");
    expect(tags[1].path).toBe("./b.pdf");
    expect(tags[1].name).toBe("B");
  });

  it("ignores unknown tags", () => {
    const tags = parseRichTags('<video path="./clip.mp4" />');
    expect(tags).toEqual([]);
  });

  it("handles paths with spaces", () => {
    const tags = parseRichTags('<image path="./my chart.png" />');
    expect(tags).toEqual([{ type: "image", path: "./my chart.png", alt: undefined, name: undefined }]);
  });

  it("returns empty array when no tags", () => {
    const tags = parseRichTags("Hello world, no tags here.");
    expect(tags).toEqual([]);
  });

  it("skips tags without path attribute", () => {
    const tags = parseRichTags('<image alt="no path" />');
    expect(tags).toEqual([]);
  });

  it("parses single-quoted and paired rich tags", () => {
    const tags = parseRichTags("<file path='./roadmap.md' name='Roadmap'></file>");
    expect(tags).toEqual([
      { type: "file", path: "./roadmap.md", alt: undefined, name: "Roadmap" },
    ]);
  });
});

describe("transformRichTags", () => {
  it("transforms image tag to markdown image", () => {
    const result = transformRichTags('<image path="./chart.png" alt="Chart" />');
    expect(result).toBe("![Chart](sandboxed-image://.%2Fchart.png)");
  });

  it("transforms file tag to markdown link", () => {
    const result = transformRichTags('<file path="./report.pdf" name="Report" />');
    expect(result).toBe("[Report](sandboxed-file://.%2Freport.pdf)");
  });

  it("preserves surrounding text", () => {
    const result = transformRichTags('Before\n<image path="./a.png" />\nAfter');
    expect(result).toBe("Before\n![a.png](sandboxed-image://.%2Fa.png)\nAfter");
  });

  it("handles multiple tags", () => {
    const result = transformRichTags('<image path="./a.png" />\n<file path="./b.pdf" />');
    expect(result).toContain("sandboxed-image://");
    expect(result).toContain("sandboxed-file://");
  });

  it("returns content unchanged when no tags", () => {
    const content = "Hello world, no tags here.";
    expect(transformRichTags(content)).toBe(content);
  });

  it("uses filename as alt when alt not provided for image", () => {
    const result = transformRichTags('<image path="./chart.png" />');
    expect(result).toBe("![chart.png](sandboxed-image://.%2Fchart.png)");
  });

  it("uses filename as name when name not provided for file", () => {
    const result = transformRichTags('<file path="./report.pdf" />');
    expect(result).toBe("[report.pdf](sandboxed-file://.%2Freport.pdf)");
  });

  it("URI-encodes paths with spaces", () => {
    const result = transformRichTags('<image path="./my chart.png" />');
    expect(result).toContain("sandboxed-image://.%2Fmy%20chart.png");
  });

  it("transforms paired rich tags", () => {
    const result = transformRichTags("<file path='./report.md' name='Report'></file>");
    expect(result).toBe("[Report](sandboxed-file://.%2Freport.md)");
  });
});

describe("stripRichFileTagsByName", () => {
  it("removes duplicate file tags by display name", () => {
    const result = stripRichFileTagsByName(
      'Here\n<file path="./roadmap.md" name="Roadmap" />',
      ["Roadmap"],
    );
    expect(result).toBe("Here\n");
  });

  it("removes duplicate paired file tags by basename", () => {
    const result = stripRichFileTagsByName(
      "Here\n<file path='./roadmap.md'></file>",
      ["roadmap.md"],
    );
    expect(result).toBe("Here\n");
  });

  it("removes duplicate file tags by normalized stem", () => {
    const result = stripRichFileTagsByName(
      'Here\n<file path="./keel_os_mvp_roadmap.md" name="Keel OS MVP Roadmap" />',
      ["/api/control/shared-files/Keel-OS-MVP-Roadmap.md"],
    );
    expect(result).toBe("Here\n");
  });
});

describe("hasPartialRichTag", () => {
  it("detects incomplete image tag", () => {
    expect(hasPartialRichTag('Some text <image path="foo')).toBe(true);
  });

  it("detects incomplete file tag", () => {
    expect(hasPartialRichTag('<file path="bar" na')).toBe(true);
  });

  it("detects tag name only", () => {
    expect(hasPartialRichTag("Some text <image")).toBe(true);
  });

  it("returns false for complete tags", () => {
    expect(hasPartialRichTag('<image path="./a.png" />')).toBe(false);
  });

  it("returns false for no tags", () => {
    expect(hasPartialRichTag("Hello world")).toBe(false);
  });

  it("returns false for closed html tags", () => {
    expect(hasPartialRichTag("<b>bold</b>")).toBe(false);
  });
});
