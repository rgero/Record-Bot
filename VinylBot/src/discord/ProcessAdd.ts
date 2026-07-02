import { EmbedBuilder, Message } from "discord.js";

import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl.js";
import { addVinyl } from "../services/vinyls.api.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getSpotifyData } from "../spotify/getSpotifyData.js";
import { getUserByName } from "../services/users.api.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";

export const ProcessAdd = async (message: Message) => {
  const args = message.content.split(" ").slice(1).join(" ").trim();
  const [spotifyLink, ...notesArray] = args.split(" ");
  const notes = notesArray.join(" ").trim();

  const parsed: SpotifyUrl | null = parseSpotifyUrl(spotifyLink);
  if (!parsed) return;

  try {
    await message.suppressEmbeds(true);
    const [spotifyData, userID] = await Promise.all([
      getSpotifyData(parsed),
      getUserByName(getDropdownValue(message.author?.username || "Unknown", message.author.id))
    ]);

    if (!userID) {
      return message.reply("⚠️ User not found in system.");
    }

    const { artists, albumName, albumArt, releaseDate, totalTracks, length } = spotifyData;

    const purchaseDate = new Date().toISOString();

    const status = await addVinyl({artist: artists, album: albumName, imageUrl: albumArt,notes, purchaseDate, owners: [userID.id], doubleLP: false, length});
    if (status === "ERROR") {
      return message.reply("❌ System error: Could not save to database.");
    }
    const isDuplicate = status === "DUPLICATE";
    
    const mappedRequester = getDropdownValue(message.author?.username || "", message.author.id);

    const embed = new EmbedBuilder()
      .setTitle(isDuplicate ? `⚠️ Already Listed: ${escapeColons(albumName)}` : `✅ Added: ${escapeColons(albumName)}`)
      .setDescription(escapeColons(artists))
      .setColor(isDuplicate ? 0xf1c40f : 0x1db954)
      .setThumbnail(albumArt)
      .setURL(`https://open.spotify.com/${parsed.type}/${parsed.id}`)
      .addFields(
        { name: "Release Date", value: releaseDate || "N/A", inline: true },
        { name: "Tracks", value: `${totalTracks || "N/A"}`, inline: true },
        { name: "Added By", value: mappedRequester, inline: true },
        { name: "Length", value: `${length || "Unknown"}`, inline: true },
        { name: "Notes", value: notes || "None", inline: true },
      );

    await message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("ProcessAdd Error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await message.reply(`❌ Error: ${errorMsg}`);
  }
};