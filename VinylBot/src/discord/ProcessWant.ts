import { EmbedBuilder, Message } from "discord.js";

import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl.js";
import { addWantedItem } from "../services/wantlist.api.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getSpotifyData } from "../spotify/getSpotifyData.js";
import { getUserByName } from "../services/users.api.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";

export const ProcessWant = async (message: Message) => {
  const args = message.content.split(" ").slice(1).join(" ").trim();
  const [spotifyLink, ...notesArray] = args.split(" ");
  const notes = notesArray.join(" ").trim();

  const parsed: SpotifyUrl | null = parseSpotifyUrl(spotifyLink);
  if (!parsed) return;

  try {
    await message.suppressEmbeds(true);
    const [spotifyData, userID] = await Promise.all([
      getSpotifyData(parsed),
      getUserByName(getDropdownValue(message.author?.username || "Unknown"))
    ]);

    if (!userID) {
      return message.reply("⚠️ User not found in system.");
    }

    const { artists, albumName, albumArt, releaseDate, totalTracks } = spotifyData;

    const status = await addWantedItem({artist: artists, album: albumName,imageUrl: albumArt,notes,searcher: [userID.id]});
    if (status === "ERROR") {
      return message.reply("❌ System error: Could not save to database.");
    }
    const isDuplicate = status === "DUPLICATE";
    
    const mappedRequester = getDropdownValue(message.author?.username);

    const embed = new EmbedBuilder()
      .setTitle(isDuplicate ? `⚠️ Already Listed: ${escapeColons(albumName)}` : `✅ Added: ${escapeColons(albumName)}`)
      .setDescription(escapeColons(artists))
      .setColor(isDuplicate ? 0xf1c40f : 0x1db954)
      .setThumbnail(albumArt)
      .setURL(`https://open.spotify.com/${parsed.type}/${parsed.id}`)
      .addFields(
        { name: "Release Date", value: releaseDate || "N/A", inline: true },
        { name: "Tracks", value: `${totalTracks || "N/A"}`, inline: true },
        { name: "Requested By", value: mappedRequester, inline: true },
        { name: "Notes", value: notes || "None", inline: false }
      );

    await message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("ProcessWant Error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    message.reply(`❌ Error: ${errorMsg}`);
  }
};