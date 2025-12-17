import { EmbedBuilder } from "discord.js";
import { appendAlbumToSheet } from "../google/AppendAlbumtoWantlist.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";
import { spotifyGet } from "../spotify/spotify.js";

export const ProcessWant = async (message) => {
  const parsed = parseSpotifyUrl(message.content);
  if (!parsed) return;

  try {
    const data = await spotifyGet(`${parsed.type}s/${parsed.id}`);

    const artists = data.artists?.map(a => a.name).join(", ") || "";
    const albumName = data.name || "";
    const albumArt = data.images?.[0]?.url || "";
    
    const requester = message.author?.username || "Unknown";
    const mappedRequester = getDropdownValue(requester);

    const added = await appendAlbumToSheet(artists, albumName, albumArt, mappedRequester);

    const embed = new EmbedBuilder()
      .setTitle(added ? `✅ Added: ${albumName}` : `⚠️ Already on the list`)
      .setDescription(artists)
      .setColor(added ? 0x1db954 : 0xf1c40f)
      .setThumbnail(albumArt)
      .setURL(`https://open.spotify.com/${parsed.type}/${parsed.id}`)
      .addFields(
        { name: "Release Date", value: data.release_date || "N/A", inline: true },
        { name: "Tracks", value: `${data.total_tracks || "N/A"}`, inline: true },
        { name: "Requested By", value: mappedRequester, inline: true }
      );

    message.reply({ embeds: [embed] });

  } catch (err) {
    console.error(err);
    message.reply("❌ Failed to fetch Spotify data or write to Google Sheet.");
  }
};
