import { beforeEach, describe, expect, it, vi } from "vitest";

import { Message } from "discord.js";
import { ProcessWant } from "../../src/discord/ProcessWant.js";
import { addWantedItem } from "../../src/services/wantlist.api.js";
import { createMessage } from "../MockedMessage.js";
import { escapeColons } from "../../src/utils/escapeColons.js";
import { getDropdownValue } from "../../src/utils/discordToDropdown.js";
import { getSpotifyData } from "../../src/spotify/getSpotifyData.js";
import { getUserByName } from "../../src/services/users.api.js";
import { haveVinyl } from "../../src/services/vinyls.api.js";
import { parseSpotifyUrl } from "../../src/spotify/parseSpotifyUrl.js";

vi.mock("discord.js", () => {
  return {
    EmbedBuilder: class {
      data: any = {};
      setTitle(title: string) { this.data.title = title; return this; }
      setDescription(desc: string) { this.data.description = desc; return this; }
      setColor(color: number) { this.data.color = color; return this; }
      setThumbnail(url: string) { this.data.thumbnail = { url }; return this; }
      setURL(url: string) { this.data.url = url; return this; }
      addFields(...fields: any[]) { this.data.fields = fields; return this; }
    },
  };
});

vi.mock("../../src/services/wantlist.api.js", () => ({
  addWantedItem: vi.fn(),
}));

vi.mock("../../src/services/vinyls.api.js", () => ({
  haveVinyl: vi.fn(),
}));

vi.mock("../../src/services/users.api.js", () => ({
  getUserByName: vi.fn(),
}));

vi.mock("../../src/spotify/getSpotifyData.js", () => ({
  getSpotifyData: vi.fn(),
}));

vi.mock("../../src/spotify/parseSpotifyUrl.js", () => ({
  parseSpotifyUrl: vi.fn(),
}));

vi.mock("../../src/utils/escapeColons.js", () => ({
  escapeColons: vi.fn(),
}));

vi.mock("../../src/utils/discordToDropdown.js", () => ({
  getDropdownValue: vi.fn(),
}));

const mockSpotifyData = {
  artists: "Some Artist",
  albumName: "Some Album",
  albumArt: "album-art.jpg",
  releaseDate: "2024-01-01",
  totalTracks: 2,
  length: 60
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

    vi.mocked(getSpotifyData).mockResolvedValue(mockSpotifyData);
    vi.mocked(getUserByName).mockResolvedValue({ id: "user_123", name: "Roy" });
    vi.mocked(getDropdownValue).mockReturnValue("Roy");
    vi.mocked(escapeColons).mockImplementation((s) => s as string);
    vi.mocked(haveVinyl).mockResolvedValue(false);
  });

  it("adds a new album and uses success color", async () => {
    const message = createMessage(
      "!want https://open.spotify.com/album/abc123 personal notes"
    );

    vi.mocked(addWantedItem).mockResolvedValue("ADDED");

    await ProcessWant(message as unknown as Message);

    expect(message.suppressEmbeds).toHaveBeenCalledWith(true);
    expect(addWantedItem).toHaveBeenCalledWith({
      artist: "Some Artist",
      album: "Some Album",
      imageUrl: "album-art.jpg",
      searcher: ["user_123"],
      notes: "personal notes",
    });

    const replyPayload = message.reply.mock.calls[0][0];
    const embed = replyPayload.embeds[0].data;

    expect(embed.title).toBe("✅ Added: Some Album");
    expect(embed.description).toBe("Some Artist");
    expect(embed.color).toBe(0x1db954);
    expect(embed.thumbnail.url).toBe("album-art.jpg");
    expect(embed.url).toBe("https://open.spotify.com/album/abc123");

    expect(embed.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Release Date", value: "2024-01-01" }),
        expect.objectContaining({ name: "Tracks", value: "2" }),
        expect.objectContaining({ name: "Requested By", value: "Roy" }),
        expect.objectContaining({ name: "Notes", value: "personal notes" }),
      ])
    );
  });

  it("returns a reply warning if user is not found in system", async () => {
    const message = createMessage("!want https://open.spotify.com/album/abc123");
    vi.mocked(getUserByName).mockResolvedValue(null);

    await ProcessWant(message as unknown as Message);

    expect(message.reply).toHaveBeenCalledWith("⚠️ User not found in system.");
    expect(addWantedItem).not.toHaveBeenCalled();
  });

  it("returns a reply warning if the user already owns the vinyl", async () => {
    const message = createMessage("!want https://open.spotify.com/album/abc123");
    vi.mocked(haveVinyl).mockResolvedValue(true);

    await ProcessWant(message as unknown as Message);

    expect(haveVinyl).toHaveBeenCalledWith({ artist: "Some Artist", album: "Some Album" });
    expect(message.reply).toHaveBeenCalledWith("⚠️ You already own this.");
    expect(addWantedItem).not.toHaveBeenCalled();
  });

  it("handles duplicate list addition gracefully and uses warning color", async () => {
    const message = createMessage("!want https://open.spotify.com/album/abc123");
    vi.mocked(addWantedItem).mockResolvedValue("DUPLICATE");

    await ProcessWant(message as unknown as Message);

    const replyPayload = message.reply.mock.calls[0][0];
    const embed = replyPayload.embeds[0].data;

    expect(embed.title).toBe("⚠️ Already Listed: Some Album");
    expect(embed.color).toBe(0xf1c40f);
  });

  it("handles a database error status gracefully", async () => {
    const message = createMessage("!want https://open.spotify.com/album/abc123");
    vi.mocked(addWantedItem).mockResolvedValue("ERROR");

    await ProcessWant(message as unknown as Message);

    expect(message.reply).toHaveBeenCalledWith("❌ System error: Could not save to database.");
  });

  it("escapes colons in album and artist names inside embed UI", async () => {
    vi.mocked(escapeColons).mockImplementation((s) => `escaped:${s}`);
    vi.mocked(addWantedItem).mockResolvedValue("ADDED");

    const message = createMessage("!want https://open.spotify.com/album/abc123");

    await ProcessWant(message as unknown as Message);

    const replyPayload = message.reply.mock.calls[0][0];
    const embed = replyPayload.embeds[0].data;

    expect(embed.title).toBe("✅ Added: escaped:Some Album");
    expect(embed.description).toBe("escaped:Some Artist");
  });

  it("returns early if spotify URL is invalid", async () => {
    vi.mocked(parseSpotifyUrl).mockReturnValue(null);

    const message = createMessage("!want not-a-link");

    await ProcessWant(message as unknown as Message);

    expect(message.reply).not.toHaveBeenCalled();
  });

  it("handles unexpected errors and replies with failure message", async () => {
    vi.mocked(getSpotifyData).mockRejectedValue(new Error("Spotify API Down"));

    const message = createMessage("!want https://open.spotify.com/album/abc123");

    await ProcessWant(message as unknown as Message);

    expect(message.reply).toHaveBeenCalledWith("❌ Error: Spotify API Down");
  });
});