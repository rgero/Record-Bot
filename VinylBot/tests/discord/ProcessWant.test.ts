import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessWant } from "../../src/discord/ProcessWant.js";
import {addWantedItem} from "../../src/services/wantlist.api.js";
import { createMessage } from "../MockedMessage.js";
import { escapeColons } from "../../src/utils/escapeColons.js";
import { getDropdownValue } from "../../src/utils/discordToDropdown.js";
import {getUserByName} from '../../src/services/users.api';
import { parseSpotifyUrl } from "../../src/spotify/parseSpotifyUrl.js";
import { spotifyGet } from "../../src/services/spotify.api.js";

vi.mock("discord.js", () => {
  return {
    EmbedBuilder: class {
      data: any = {};
      setTitle(title: string) { this.data.title = title; return this; }
      setDescription(desc: string) { this.data.description = desc; return this; }
      setColor(color: number) { this.data.color = color; return this; } // Changed to number
      setThumbnail(url: string) { this.data.thumbnail = { url }; return this; }
      setURL(url: string) { this.data.url = url; return this; }
      addFields(...fields: any[]) { this.data.fields = fields; return this; }
    },
  };
});

vi.mock("../../src/services/wantlist.api", () => ({
  addWantedItem: vi.fn(),
}));

vi.mock("../../src/utils/escapeColons", () => ({
  escapeColons: vi.fn(),
}));

vi.mock("../../src/utils/discordToDropdown", () => ({
  getDropdownValue: vi.fn(),
}));

vi.mock("../../src/spotify/parseSpotifyUrl", () => ({
  parseSpotifyUrl: vi.fn(),
}));

vi.mock("../../src/services/spotify.api", () => ({
  spotifyGet: vi.fn(),
}));

vi.mock("../../src/services/users.api", () => ({
  getUserByName: vi.fn(),
}));

const spotifyResponse = {
  name: "Some Album",
  artists: [{ name: "Some Artist" }],
  images: [{ url: "album-art.jpg" }],
  release_date: "2024-01-01",
  total_tracks: 12,
};

describe("ProcessWant", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(parseSpotifyUrl).mockReturnValue({
      type: "album",
      id: "abc123",
    });

    vi.mocked(spotifyGet).mockResolvedValue(spotifyResponse);
    vi.mocked(getDropdownValue).mockReturnValue("Roy");
    vi.mocked(escapeColons).mockImplementation((s) => s);
  });

  it("adds a new album and uses success color", async () => {
    const message = createMessage(
      "!want https://open.spotify.com/album/abc123 personal notes"
    )

    vi.mocked(addWantedItem).mockResolvedValue("ADDED");
    vi.mocked(getUserByName).mockResolvedValue({id: "Roy", name: "Roy"})

    await ProcessWant(message);

    expect(addWantedItem).toHaveBeenCalledWith({
      artist: "Some Artist",
      album: "Some Album",
      imageUrl: "album-art.jpg",
      searcher: ["Roy"],
      notes: "personal notes"
    });

    const embed = message.reply.mock.calls[0][0].embeds[0].data;

    expect(embed.title).toBe("✅ Added: Some Album");
    expect(embed.description).toBe("Some Artist");
    expect(embed.color).toBe(0x1db954); // ✅ green
    expect(embed.url).toBe("https://open.spotify.com/album/abc123");

    expect(embed.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Requested By", value: "Roy" }),
        expect.objectContaining({ name: "Notes", value: "personal notes" }),
      ])
    );
  });

  it("handles duplicate album and uses warning color", async () => {
    const message = createMessage(
      "!want https://open.spotify.com/album/abc123"
    );

    vi.mocked(addWantedItem).mockResolvedValue("DUPLICATE");

    await ProcessWant(message);

    const embed = message.reply.mock.calls[0][0].embeds[0].data;

    expect(embed.title).toBe("⚠️ Already Listed: Some Album");
    expect(embed.color).toBe(0xf1c40f); // ⚠️ yellow
  });

  it("escapes colons in album and artist names", async () => {
    vi.mocked(escapeColons).mockImplementation((s) => `escaped:${s}`);
    vi.mocked(addWantedItem).mockResolvedValue(true);

    const message = createMessage(
      "!want https://open.spotify.com/album/abc123"
    );

    await ProcessWant(message);

    const embed = message.reply.mock.calls[0][0].embeds[0].data;

    expect(embed.title).toBe("✅ Added: escaped:Some Album");
    expect(embed.description).toBe("escaped:Some Artist");
  });

  it("returns early if spotify URL is invalid", async () => {
    vi.mocked(parseSpotifyUrl).mockReturnValue(null);

    const message = createMessage("!want not-a-link");

    await ProcessWant(message);

    expect(message.reply).not.toHaveBeenCalled();
  });

  it("handles errors and replies with failure message", async () => {
    vi.mocked(spotifyGet).mockRejectedValue(new Error("Spotify down"));

    const message = createMessage(
      "!want https://open.spotify.com/album/abc123"
    );

    await ProcessWant(message);

    expect(message.reply).toHaveBeenCalledWith(
      "❌ Error: Spotify down"
    );
  });
});
