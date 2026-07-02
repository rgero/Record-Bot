import { beforeEach, describe, expect, it, vi } from "vitest";

import fs from "fs";

vi.mock("fs");

describe("getDropdownValue", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should return the mapped value for a known discordId", async () => {
    const mockMapping = {
      geminni: {
        displayName: "Anna",
        discordId: "123456",
      },
    };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));

    const { getDropdownValue } = await import("../../src/utils/discordToDropdown.js");

    expect(getDropdownValue("geminni", "123456")).toBe("Anna");
  });

  it("should fall back to the username when no matching discordId is provided", async () => {
    const mockMapping = {
      geminni: {
        displayName: "Anna",
        discordId: "123456",
      },
    };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));

    const { getDropdownValue } = await import("../../src/utils/discordToDropdown.js");

    expect(getDropdownValue("geminni", "999999")).toBe("Anna");
  });

  it("should return 'Unknown' when the mapping is not found by discordId", async () => {
    const mockMapping = {
      roymond: {
        displayName: "Roy",
        discordId: "111",
      },
      geminni: {
        displayName: "Anna",
        discordId: "222",
      },
    };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));

    const { getDropdownValue } = await import("../../src/utils/discordToDropdown.js");

    expect(getDropdownValue("roymond", "222", null)).toBe("Anna");
  });

  it("should return 'Unknown' and log error if the file fails to load", async () => {
    // Simulate file not found or permission error
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error("File not found");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getDropdownValue } = await import("../../src/utils/discordToDropdown.js");

    expect(getDropdownValue("anyUser")).toBe("Unknown");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load discordMapping.json",
      expect.any(Error)
    );
  });
});