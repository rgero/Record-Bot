import { EmbedBuilder } from "discord.js";
import { appendAlbumToSheet } from "../google/AppendAlbumToWantlist.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getSpotifyData } from "../spotify/getSpotifyData.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";

export const ProcessWant = async (message) => {
  const args = message.content.split(" ").slice(1).join(" ").trim();
  const spotifyLink = args.split(" ")[0]
  const notes = args.split(" ").slice(1).join(" ").trim();

  const parsed = parseSpotifyUrl(spotifyLink);
  if (!parsed) return;
  try {
    await message.suppressEmbeds(true);
    const {artists, albumName, albumArt, releaseDate, totalTracks} = await getSpotifyData(parsed);
    const requester = message.author?.username || "Unknown";
    const mappedRequester = getDropdownValue(requester);

    const added = await appendAlbumToSheet(artists, albumName, albumArt, mappedRequester, notes);

    const embed = new EmbedBuilder()
      .setTitle(added ? `✅ Added: ${escapeColons(albumName)}` : `⚠️ Already on the list`)
      .setDescription(escapeColons(artists))
      .setColor(added ? 0x1db954 : 0xf1c40f)
      .setThumbnail(albumArt)
      .setURL(`https://open.spotify.com/${parsed.type}/${parsed.id}`)
      .addFields(
        { name: "Release Date", value: releaseDate || "N/A", inline: true },
        { name: "Tracks", value: `${totalTracks || "N/A"}`, inline: true },
        { name: "Requested By", value: mappedRequester, inline: true },
        { name: "Notes", value: notes, inline: true }
      );

    message.reply({ embeds: [embed] });

  } catch (err) {
    console.error(err);
    message.reply("❌ Failed to fetch Spotify data or write to Google Sheet.");
  }
};
