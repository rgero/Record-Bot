import { describe, expect, it } from "vitest";

import { parseExistsArgs, tokenizeExistsArgs } from "../../src/utils/parseExistsArgs.js";

describe("tokenizeExistsArgs", () => {
  it("keeps quoted phrases together", () => {
    expect(tokenizeExistsArgs(`--artist "bbno$" --album 'bbno$'`)).toEqual([
      "--artist",
      "bbno$",
      "--album",
      "bbno$",
    ]);
  });

  it("supports multi-word flag values", () => {
    expect(tokenizeExistsArgs("--artist Tyler, The Creator --album Igor")).toEqual([
      "--artist",
      "Tyler,",
      "The",
      "Creator",
      "--album",
      "Igor",
    ]);
  });
});

describe("parseExistsArgs", () => {
  it("parses artist and album flags", () => {
    const result = parseExistsArgs("!exists --artist bbno$ --album bbno$");
    expect(result).toEqual({
      ok: true,
      input: { source: "flags", artist: "bbno$", album: "bbno$" },
    });
  });

  it("parses quoted names with special characters", () => {
    const result = parseExistsArgs('!exists --artist "bbno$" --album "bbno$"');
    expect(result).toEqual({
      ok: true,
      input: { source: "flags", artist: "bbno$", album: "bbno$" },
    });
  });

  it("detects a spotify album link anywhere in the message", () => {
    const result = parseExistsArgs(
      "!exists https://open.spotify.com/album/abc123xyz extra words"
    );
    expect(result).toEqual({
      ok: true,
      input: { source: "spotify", url: { type: "album", id: "abc123xyz" } },
    });
  });

  it("requires both flags when not using spotify", () => {
    const result = parseExistsArgs("!exists --artist Radiohead");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Both `--artist` and `--album`");
    }
  });

  it("rejects unknown flags", () => {
    const result = parseExistsArgs("!exists --artist Foo --format Vinyl");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unknown flag");
    }
  });
});
