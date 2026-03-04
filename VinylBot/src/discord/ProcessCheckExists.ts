import { EmbedBuilder, Message } from "discord.js";

import { CheckAlbumExistence } from "../discogs/CheckAlbumExistence.js";
import { DiscogResponse } from "../interfaces/DiscogResponse.js";
import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getSpotifyData } from "../spotify/getSpotifyData.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";

export const ProcessCheckExists = async (message: Message) => {
  const args = message.content.split(" ").slice(1);
  
  const reply = await message.reply("🔍 Checking album existence…");

  try {
    let response: DiscogResponse | null = null;
    let albumName = "";
    let artists = "";

    // Case 1: Spotify URL provided
    const spotifyURL: SpotifyUrl | null = parseSpotifyUrl(args[0]);
    if (spotifyURL) {
      await message.suppressEmbeds(true);

      const spotifyData = await getSpotifyData(spotifyURL);
      ({ artists, albumName } = spotifyData);

      response = await CheckAlbumExistence(artists, albumName);
    } else {
      // Case 2: Artist | Album provided
      const queryString = args.join(" ");
      const match = queryString.match(/^(.+?)\s*\|\s*(.+)$/);

      if (!match) {
        return reply.edit(
          "❌ Please provide both artist and album name separated by `Artist | Album`, or include a Spotify link."
        );
      }

      [, artists, albumName] = match;
      response = await CheckAlbumExistence(artists, albumName);
    }

    if (!response) {
      return reply.edit("Error getting response from Discogs. Try again or go the website")
    }

    const embed = new EmbedBuilder()
      .setTitle(`Does: ${escapeColons(response?.title)} exist?`)
      .setColor(0xf1c40f)
      .setThumbnail(
        response?.cover ?? "https://records.roymond.net/placeholder-album.png"
      )
      .addFields({
        name: "Exists?",
        value: response?.exists ? "✅ Yes" : "❌ No",
        inline: true,
      });

    await reply.edit({ content: "", embeds: [embed] });

  } catch (err) {
    console.error("ProcessCheckExists Error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    await reply.edit(`❌ Error: ${errorMsg}`);
  }
};
