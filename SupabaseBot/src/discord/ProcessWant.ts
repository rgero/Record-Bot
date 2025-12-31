import { EmbedBuilder, Message } from "discord.js";
import { addWantedItem, findWantedItem } from "../services/wantlist.api";

import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl";
import { WantedItem } from "../interfaces/WantedItem";
import { escapeColons } from "../utils/escapeColons";
import { getDropdownValue } from "../utils/discordToDropdown";
import { getSpotifyData } from "../spotify/getSpotifyData";
import { getUserByName } from "../services/users.api";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl";

export const ProcessWant = async (message: Message) => {
  const args = message.content.split(" ").slice(1).join(" ").trim();
  const spotifyLink = args.split(" ")[0]
  const notes = args.split(" ").slice(1).join(" ").trim();

  const parsed: SpotifyUrl|null = parseSpotifyUrl(spotifyLink);
  if (!parsed) return;
  try {
    await new Promise(resolve => setTimeout(resolve, 750));
    await message.suppressEmbeds(true);
    const {artists, albumName, albumArt, releaseDate, totalTracks} = await getSpotifyData(parsed);
    const requester = message.author?.username || "Unknown";
    const mappedRequester = getDropdownValue(requester);

    const userID = await getUserByName(mappedRequester);
    if (!userID) {
      return;
    }

    const searchItem: Partial<WantedItem> = {
      artist: artists,
      album: albumName,
      imageUrl: albumArt,
      notes
    }

    // Check if it is in the list
    const isInList = await findWantedItem(searchItem);
    let added = false;
    if (isInList && isInList.length == 0)
    {
      console.log("Butts");
      const newItem: WantedItem = {
        artist: artists,
        album: albumName,
        imageUrl: albumArt,
        notes,
        searcher: [userID.id]
      }
      added = await addWantedItem(newItem);
    }

    let embed: EmbedBuilder = new EmbedBuilder()
    if (!added)
    {
      embed.setTitle(`Error adding album - ${albumName}`)
    } else {
      embed.setTitle(isInList ? `✅ Added: ${escapeColons(albumName)}` : `⚠️ Already on the list`)
    }

    embed.setDescription(escapeColons(artists))
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
