import { beforeEach, describe, expect, it, vi } from "vitest";

import { appendAlbumToSheet } from "../../src/google/AppendAlbumtoWantlist.js";
import { checkIfAlbumExists } from "../../src/google/CheckAlbumExists.js";
import { getGoogleSheetsClient } from "../../src/google/GetGoogleSheetsClient.js";

vi.mock("../../src/google/CheckAlbumExists.js", () => ({
  checkIfAlbumExists: vi.fn(),
}));

vi.mock("../../src/google/GetGoogleSheetsClient.js", () => ({
  getGoogleSheetsClient: vi.fn(),
}));

describe("appendAlbumToSheet", () => {
  const mockAppend = vi.fn();
  const mockSheetsInstance = {
    spreadsheets: {
      values: { 
        append: mockAppend 
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppend.mockResolvedValue({ status: 200 });

    process.env.SPREADSHEET_ID = "test-id-123";
    process.env.WANT_LIST_SHEET_NAME = "testing-search";

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(getGoogleSheetsClient).mockResolvedValue(mockSheetsInstance);
  });

  it("should return false (gracefully handle error) if Google API fails", async () => {
    // Simulate an API error (e.g., sheet name not found or permission denied)
    mockAppend.mockRejectedValue(new Error("Unable to parse range"));
    vi.mocked(checkIfAlbumExists).mockResolvedValue(false);

    const result = await appendAlbumToSheet("Artist", "Album", null, "User", "", "Missing");

    expect(result).toBe(false);
    // Verifies the catch block caught the error
    expect(console.log).toHaveBeenCalled(); 
  });

  it("should return false and not append if album already exists", async () => {
    vi.mocked(checkIfAlbumExists).mockResolvedValue(true);

    const result = await appendAlbumToSheet("Artist", "Album", "img.jpg", "User");

    expect(result).toBe(false);
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it("should append data correctly including IMAGE formula", async () => {
    vi.mocked(checkIfAlbumExists).mockResolvedValue(false);

    const result = await appendAlbumToSheet("Rise Against", "Endgame", "img.jpg", "Roy");

    expect(result).toBe(true);
    expect(mockAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        spreadsheetId: "test-id-123",
        range: "'testing-search'!A:E",
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [["Rise Against", "Endgame", '=IMAGE("img.jpg")', "Roy", ""]],
        },
      })
    );
  });

  it("should throw error if SPREADSHEET_ID is missing", async () => {
    delete process.env.SPREADSHEET_ID;

    await expect(appendAlbumToSheet("Artist", "Album"))
      .rejects.toThrow("SPREADSHEET_ID is not set in .env");
  });
});