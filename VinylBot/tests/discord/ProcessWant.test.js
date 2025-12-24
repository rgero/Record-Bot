import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessWant } from "../../src/discord/ProcessWant.js";
import { appendAlbumToSheet } from "../../src/google/AppendAlbumToWantlist.js";
import { escapeColons } from "../../src/utils/escapeColons.js";
import { getDropdownValue } from "../../src/utils/discordToDropdown.js";
import { parseSpotifyUrl } from "../../src/spotify/parseSpotifyUrl.js";
import { spotifyGet } from "../../src/spotify/spotify.js";

vi.mock("discord.js", () => {
  return {
    EmbedBuilder: class {
      constructor() {
        this.data = {};
      }
      setTitle(title) {
        this.data.title = title;
        return this;
      }
      setDescription(description) {
        this.data.description = description;
        return this;
      }
      setColor(color) {
        this.data.color = color;
        return this;
      }
      setThumbnail(url) {
        this.data.thumbnail = { url };
        return this;
      }
      setURL(url) {
        this.data.url = url;
        return this;
      }
      addFields(...fields) {
        this.data.fields = fields;
        return this;
      }
    },
  };
});

vi.mock("../../src/google/AppendAlbumToWantlist.js", () => ({
  appendAlbumToSheet: vi.fn(),
}));

vi.mock("../../src/utils/escapeColons.js", () => ({
  escapeColons: vi.fn(),
}));

vi.mock("../../src/utils/discordToDropdown.js", () => ({
  getDropdownValue: vi.fn(),
}));

vi.mock("../../src/spotify/parseSpotifyUrl.js", () => ({
  parseSpotifyUrl: vi.fn(),
}));

vi.mock("../../src/spotify/spotify.js", () => ({
  spotifyGet: vi.fn(),
}));

const createMessage = (content) => ({
  content,
  author: { username: "Roy" },
  reply: vi.fn(),
  suppressEmbeds: vi.fn(),
});

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

    parseSpotifyUrl.mockReturnValue({
      type: "album",
      id: "abc123",
    });

    spotifyGet.mockResolvedValue(spotifyResponse);
    getDropdownValue.mockReturnValue("Roy");
    escapeColons.mockImplementation((s) => s);
  });

  it("adds a new album and uses success color", async () => {
    const message = createMessage(
      "!want https://open.spotify.com/album/abc123 personal notes"
    );

    appendAlbumToSheet.mockResolvedValue(true);

    await ProcessWant(message);

    expect(appendAlbumToSheet).toHaveBeenCalledWith(
      "Some Artist",
      "Some Album",
      "album-art.jpg",
      "Roy",
      "personal notes"
    );

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

    appendAlbumToSheet.mockResolvedValue(false);

    await ProcessWant(message);

    const embed = message.reply.mock.calls[0][0].embeds[0].data;

    expect(embed.title).toBe("⚠️ Already on the list");
    expect(embed.color).toBe(0xf1c40f); // ⚠️ yellow
  });

  it("escapes colons in album and artist names", async () => {
    escapeColons.mockImplementation((s) => `escaped:${s}`);
    appendAlbumToSheet.mockResolvedValue(true);

    const message = createMessage(
      "!want https://open.spotify.com/album/abc123"
    );

    await ProcessWant(message);

    const embed = message.reply.mock.calls[0][0].embeds[0].data;

    expect(embed.title).toBe("✅ Added: escaped:Some Album");
    expect(embed.description).toBe("escaped:Some Artist");
  });

  it("returns early if spotify URL is invalid", async () => {
    parseSpotifyUrl.mockReturnValue(null);

    const message = createMessage("!want not-a-link");

    await ProcessWant(message);

    expect(message.reply).not.toHaveBeenCalled();
  });

  it("handles errors and replies with failure message", async () => {
    spotifyGet.mockRejectedValue(new Error("Spotify down"));

    const message = createMessage(
      "!want https://open.spotify.com/album/abc123"
    );

    await ProcessWant(message);

    expect(message.reply).toHaveBeenCalledWith(
      "❌ Failed to fetch Spotify data or write to Google Sheet."
    );
  });
});
