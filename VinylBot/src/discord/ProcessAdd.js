import { EmbedBuilder } from "discord.js";
import { appendAlbumToSheet } from "../google/sheets.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";
import { spotifyGet } from "../spotify/spotify.js";

export const ProcessAdd = async (message) => {
    const parsed = parseSpotifyUrl(message.content);
  if (!parsed) return; // Not a Spotify URL

  try {
    // Fetch data from Spotify
    const data = await spotifyGet(`${parsed.type}s/${parsed.id}`);

    const artists = data.artists?.map(a => a.name).join(", ") || "";
    const albumName = data.name || "";
    const albumArt = data.images?.[0]?.url || ""; // 640x640 image

    // Create Discord embed
    const embed = new EmbedBuilder()
      .setTitle(`Added: ${albumName}`)
      .setDescription(artists)
      .setColor(0x1db954) // Spotify green
      .setThumbnail(albumArt)
      .addFields(
        { name: "Release Date", value: data.release_date || "N/A", inline: true },
        { name: "Tracks", value: `${data.total_tracks || "N/A"}`, inline: true }
      )
      .setURL(`https://open.spotify.com/${parsed.type}/${parsed.id}`);

    message.reply({ embeds: [embed] });

    // Get requester info
    const requester = `${message.author.username}`;

    const dropdownValue = getDropdownValue(requester);

    // Append to Google Sheet
    await appendAlbumToSheet(artists, albumName, albumArt, dropdownValue);

  } catch (err) {
    console.error(err);
    message.reply("❌ Failed to fetch Spotify data or write to Google Sheet.");
  }
}