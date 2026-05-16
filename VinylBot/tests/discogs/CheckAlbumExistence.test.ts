import { describe, expect, it } from "vitest";

import { isVinylReleaseFormat, scoreMatch } from "../../src/discogs/CheckAlbumExistence.js";

describe("scoreMatch", () => {
  it("accepts self-titled bbno$ despite punctuation stripping", () => {
    const match = scoreMatch("bbno$", "bbno$", "bbno$ - bbno$");
    expect(match.passes).toBe(true);
  });
});

describe("isVinylReleaseFormat", () => {
  it("detects vinyl from release format blocks", () => {
    expect(
      isVinylReleaseFormat([
        { name: "Vinyl", qty: "2", descriptions: ["LP", "45 RPM", "Album", "Stereo"] },
      ] as Parameters<typeof isVinylReleaseFormat>[0])
    ).toBe(true);
  });

  it("returns false for CD-only releases", () => {
    expect(isVinylReleaseFormat([{ name: "CD", descriptions: ["Album"] }])).toBe(false);
  });
});
