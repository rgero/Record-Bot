import { beforeEach, describe, expect, it, vi } from "vitest";

import fs from "fs";

vi.mock("fs");

describe("isAuthorizedDirectMessageUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("authorizes a known username from a legacy string mapping", async () => {
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ ".roymond": "Roy" }));
    const { isAuthorizedDirectMessageUser } = await import("../../src/utils/directMessageAccess.js");

    expect(
      isAuthorizedDirectMessageUser({
        id: "123",
        username: "roymond",
        globalName: null,
      })
    ).toBe(true);
  });

  it("authorizes when the Discord global name matches", async () => {
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ geminni: "Anna" }));
    const { isAuthorizedDirectMessageUser } = await import("../../src/utils/directMessageAccess.js");

    expect(
      isAuthorizedDirectMessageUser({
        id: "123",
        username: "somethingElse",
        globalName: "geminni",
      })
    ).toBe(true);
  });

  it("authorizes by stable discordId when provided", async () => {
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        geminni: {
          displayName: "Anna",
          discordId: "999",
        },
      })
    );
    const { isAuthorizedDirectMessageUser } = await import("../../src/utils/directMessageAccess.js");

    expect(
      isAuthorizedDirectMessageUser({
        id: "999",
        username: "anything",
        globalName: null,
      })
    ).toBe(true);
  });

  it("returns false when the user is not in mapping", async () => {
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ geminni: "Anna" }));
    const { isAuthorizedDirectMessageUser } = await import("../../src/utils/directMessageAccess.js");

    expect(
      isAuthorizedDirectMessageUser({
        id: "123",
        username: "unknown",
        globalName: null,
      })
    ).toBe(false);
  });

  it("returns false and logs when mapping cannot be loaded", async () => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("File not found");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { isAuthorizedDirectMessageUser } = await import("../../src/utils/directMessageAccess.js");

    expect(
      isAuthorizedDirectMessageUser({
        id: "123",
        username: "roymond",
        globalName: null,
      })
    ).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to load discordMapping.json", expect.any(Error));
  });
});
