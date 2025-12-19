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
  // Create a mock 'sheets' object that behaves like the Google API
  const mockAppend = vi.fn();
  const mockGet = vi.fn();
  const mockSheetsInstance = {
    spreadsheets: {
      get: mockGet,
      values: { append: mockAppend },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPREADSHEET_ID = "test-id-123";

    vi.spyOn(console, "log").mockImplementation(() => {});
    
    // Tell our helper mock to return our fake sheets instance
    vi.mocked(getGoogleSheetsClient).mockResolvedValue(mockSheetsInstance);
  });

  it("should throw error if the sheet name does not exist", async () => {
    mockGet.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Other Sheet" } }] }
    });

    await expect(appendAlbumToSheet("Artist", "Album", null, "User", "", "Missing"))
      .rejects.toThrow('Sheet/tab "Missing" not found.');
  });

  it("should return false and not append if album already exists", async () => {
    mockGet.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Searching For" } }] }
    });
    vi.mocked(checkIfAlbumExists).mockResolvedValue(true);

    const result = await appendAlbumToSheet("Artist", "Album");
    
    expect(result).toBe(false);
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it("should append data correctly including IMAGE formula", async () => {
    mockGet.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Searching For" } }] }
    });
    vi.mocked(checkIfAlbumExists).mockResolvedValue(false);

    const result = await appendAlbumToSheet("Rise Against", "Endgame", "img.jpg", "Roy");

    expect(result).toBe(true);
    expect(mockAppend).toHaveBeenCalledWith(expect.objectContaining({
      resource: {
        values: [["Rise Against", "Endgame", '=IMAGE("img.jpg")', "Roy", ""]],
      },
    }));
  });
});