import { beforeEach, describe, expect, it, vi } from "vitest";

import fs from "fs";

vi.mock("fs");

describe("getDropdownValue", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should return the mapped value for a known user", async () => {
    const mockMapping = { "discordUser123": "Roy" };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
    
    const { getDropdownValue } = await import("../../src/utils/discordToDropdown.js");

    expect(getDropdownValue("discordUser123")).toBe("Roy");
  });

  it("should return 'Unknown' for a user not in the mapping", async () => {
    const mockMapping = { "discordUser123": "Roy" };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));

    const { getDropdownValue } = await import("../../src/utils/discordToDropdown.js");

    expect(getDropdownValue("SomeoneElse")).toBe("Unknown");
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