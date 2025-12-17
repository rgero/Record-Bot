import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRandomRow } from "../../src/google/GetRandomRow";

vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(() =>
      JSON.stringify({ client_email: "test@test.com" })
    ),
  },
}));

// ---- Mock googleapis ----
const appendMock = vi.fn();
const valuesGetMock = vi.fn();
const sheetsGetMock = vi.fn();

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
          get: sheetsGetMock,
          values: {
            get: valuesGetMock,
            append: appendMock,
          },
        },
      })),
    },
  };
});

describe("getRandomRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPREADSHEET_ID = "test-sheet-id";
  });

  it("returns null if sheet has no data rows", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [["Artist", "Album"]],
      },
    });

    const row = await getRandomRow({ sheetName: "Searching For" });
    expect(row).toBeNull();
  });

  it("returns a random row", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["Artist", "Album"],
          ["Gojira", "Magma"],
          ["Opeth", "Ghost Reveries"],
        ],
      },
    });

    const row = await getRandomRow({ sheetName: "Searching For" });

    expect(row).toEqual(["Gojira", "Magma"]);
  });

  it("filters rows before picking random", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["Artist", "Album"],
          ["Gojira", "Magma"],
          ["Opeth", "Ghost Reveries"],
        ],
      },
    });

    const row = await getRandomRow({
      sheetName: "Searching For",
      filterColumnIndex: 0,
      filterValue: "opeth",
    });

    expect(row).toEqual(["Opeth", "Ghost Reveries"]);
  });
});
