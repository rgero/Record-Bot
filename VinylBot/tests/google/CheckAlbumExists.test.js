import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkIfAlbumExists } from "../../src/google/CheckAlbumExists";

// fs mock (service account file)
vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(() =>
      JSON.stringify({ client_email: "test@test.com" })
    ),
  },
}));

// Google API mocks
const valuesGetMock = vi.fn();

vi.mock("googleapis", () => {
  class GoogleAuthMock {
    getClient = vi.fn().mockResolvedValue("auth-client");
  }

  return {
    google: {
      auth: {
        GoogleAuth: GoogleAuthMock,
      },
      sheets: vi.fn(() => ({
        spreadsheets: {
          values: {
            get: valuesGetMock,
          },
        },
      })),
    },
  };
});

describe("checkIfAlbumExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPREADSHEET_ID = "test-spreadsheet-id";
  });

  it("returns true when album exists (case-insensitive)", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["Artist", "Album"],
          ["Gojira", "From Mars to Sirius"],
        ],
      },
    });

    const exists = await checkIfAlbumExists(
      "Searching For",
      "gojira",
      "from mars to sirius"
    );
    expect(exists).toBe(true);
  });

  it("returns false when album does not exist", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["Artist", "Album"],
          ["Opeth", "Ghost Reveries"],
        ],
      },
    });

    const exists = await checkIfAlbumExists(
      "Searching For",
      "Gojira",
      "Magma"
    );

    expect(exists).toBe(false);
  });

  it("returns false when sheet has only a header row", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [["Artist", "Album"]],
      },
    });

    const exists = await checkIfAlbumExists(
      "Searching For",
      "Gojira",
      "Magma"
    );

    expect(exists).toBe(false);
  });

  it("returns false when no values are returned", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: {},
    });

    const exists = await checkIfAlbumExists(
      "Searching For",
      "Gojira",
      "Magma"
    );

    expect(exists).toBe(false);
  });

  it("calls Google Sheets API with correct range", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [["Artist", "Album"]],
      },
    });

    await checkIfAlbumExists(
      "Searching For",
      "Gojira",
      "Magma"
    );

    expect(valuesGetMock).toHaveBeenCalledWith({
      spreadsheetId: "test-spreadsheet-id",
      range: "Searching For",
    });
  });
});
