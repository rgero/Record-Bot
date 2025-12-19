import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessRandom } from "../../src/discord/ProcessRandom";
import { escapeColons } from "../../src/utils/escapeColons";
import { getRandomRow } from "../../src/google/GetRandomRow";

// ---- Mocks ----
vi.mock("../../src/google/GetRandomRow.js", () => ({
  getRandomRow: vi.fn(),
}));

vi.mock("../../src/utils/escapeColons.js", () => ({
  escapeColons: vi.fn(),
}));

const createMessage = (content = "!random") => ({
  content,
  reply: vi.fn(),
});

describe("ProcessRandom", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("handles !random (no param) and uses Vinyls sheet", async () => {
    const message = createMessage("!random");

    getRandomRow.mockResolvedValue(["Artist", "Album"]);
    escapeColons.mockImplementation((s) => s);

    await ProcessRandom(message);

    expect(getRandomRow).toHaveBeenCalledWith({
      sheetName: "Vinyls",
    });

    expect(message.reply).toHaveBeenCalledWith({
      embeds: [
        expect.objectContaining({
          title: "🎲 Random Pick",
          description: "🎵 **Artist**\n💿 *Album*",
          color: 0x5865f2,
        }),
      ],
    });
  });

  it("handles !random store and uses Location Info sheet", async () => {
    const message = createMessage("!random store");

    getRandomRow.mockResolvedValue(["Cool Store", "123 Main St"]);
    escapeColons.mockImplementation((s) => s);

    await ProcessRandom(message);

    expect(getRandomRow).toHaveBeenCalledWith({
      sheetName: "Location Info",
    });

    expect(message.reply).toHaveBeenCalledWith({
      embeds: [
        expect.objectContaining({
          title: "🎲 Random Pick",
          description: "Cool Store\n123 Main St",
          color: 0x5865f2,
        }),
      ],
    });
  });

  it("handles !random <name> and filters by column 9", async () => {
    const message = createMessage("!random roy");

    getRandomRow.mockResolvedValue(["Artist", "Album"]);
    escapeColons.mockImplementation((s) => s);

    await ProcessRandom(message);

    expect(getRandomRow).toHaveBeenCalledWith({
      sheetName: "Vinyls",
      filterColumnIndex: 9,
      filterValue: "roy",
    });

    expect(message.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [
          expect.objectContaining({
            color: 0x5865f2,
          }),
        ],
      })
    );
  });

  it("replies with an error if no row is returned", async () => {
    const message = createMessage("!random");

    getRandomRow.mockResolvedValue(null);

    await ProcessRandom(message);

    expect(message.reply).toHaveBeenCalledWith(
      "❌ No matching entries found."
    );
  });

  it("escapes colons in the description", async () => {
    const message = createMessage("!random");

    getRandomRow.mockResolvedValue(["Artist:Name", "Album:Title"]);
    escapeColons.mockReturnValue("escaped-description");

    await ProcessRandom(message);

    expect(escapeColons).toHaveBeenCalledWith(
      "🎵 **Artist:Name**\n💿 *Album:Title*"
    );

    expect(message.reply).toHaveBeenCalledWith({
      embeds: [
        expect.objectContaining({
          description: "escaped-description",
          color: 0x5865f2,
        }),
      ],
    });
  });

  it("handles thrown errors and replies with failure message", async () => {
    const message = createMessage("!random");

    getRandomRow.mockRejectedValue(new Error("boom"));

    await ProcessRandom(message);

    expect(message.reply).toHaveBeenCalledWith(
      "❌ Failed to fetch random entry."
    );
  });
});
