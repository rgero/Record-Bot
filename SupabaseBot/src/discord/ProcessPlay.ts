import {ActionRowBuilder, ComponentType, Message, MessageActionRowComponentBuilder, StringSelectMenuBuilder} from "discord.js";
import { getVinylByDetails, getVinylsByQuery, updateVinyl } from "../services/vinyls.api";

import { PlayLog } from "../interfaces/PlayLog";
import { SearchResponse } from "../interfaces/SearchResponse";
import { User } from "../interfaces/User";
import { Vinyl } from "../interfaces/Vinyl";
import { addPlayLog } from "../services/plays.api";
import { getDropdownValue } from "../utils/discordToDropdown";
import { getSpotifyData } from "../spotify/getSpotifyData";
import { getUserByName } from "../services/users.api";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl";

const processNewPlay = async (newPlay: PlayLog) => {
  const targetAlbum: Vinyl | null = await getVinylByDetails(newPlay.artist, newPlay.album);

  if (!targetAlbum || !targetAlbum.id) {
    throw new Error(`Can't find album: ${newPlay.artist} - ${newPlay.album}`);
  }
  
  const updatedCount = (targetAlbum.playCount || 0) + 1;

  await updateVinyl(targetAlbum.id, { playCount: updatedCount });
  await addPlayLog(newPlay);
};

export const ProcessPlay = async (message: Message) => {
  const params = message.content.split(" ").slice(1).join(" ").trim();
  const requester = message.author?.username || "Unknown";
  const username = getDropdownValue(requester);

  const user: User | null = await getUserByName(username);

  if (!user) {
    return message.reply("⚠️ User not found in system.");
  }

  // --- CASE 1: SPOTIFY URL ---
  const spotify = parseSpotifyUrl(params);
  if (spotify) {
    try {
      const { artists, albumName } = await getSpotifyData(spotify);

      const newPlay: PlayLog = {
        artist: artists,
        album: albumName,
        listeners: [user.id],
        date: new Date(),
      };

      await processNewPlay(newPlay);
      return message.reply(`✅ Logged a play for **${artists} - ${albumName}**`);
    } catch (error: any) {
      console.error(error);
      return message.reply(`❌ Failed to log Spotify play: ${error.message}`);
    }
  }

  // --- CASE 2: MANUAL SEARCH ---
  let data = await getVinylsByQuery({ type: "search", term: params });

  if (data.length === 0) {
    return message.reply("No matching albums found!");
  }

  // Exactly one match found
  if (data.length === 1) {
    const response: SearchResponse = data[0];
    try {
      const newPlay: PlayLog = {
        artist: response.artist,
        album: response.album,
        listeners: [user.id],
        date: new Date(),
      };

      await processNewPlay(newPlay);
      return message.reply(`✅ Logged a play for **${response.artist} - ${response.album}**`);
    } catch (error: any) {
      return message.reply(`❌ Failed to log play: ${error.message}`);
    }
  }

  // --- CASE 3: MULTIPLE MATCHES (DROPDOWN) ---
  const albumLimit = 25;
  const options = data.slice(0, albumLimit).map((row: SearchResponse, index) => ({
    label: `${row.artist.slice(0, 40)} - ${row.album.slice(0, 40)}`,
    value: index.toString(),
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("select_album")
    .setPlaceholder("Choose an album...")
    .addOptions(options);

  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(selectMenu);

  const replyMessage = await message.reply({
    content: "Please select the correct album from the dropdown:",
    components: [row],
  });

  const collector = replyMessage.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    max: 1,
    time: 60000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({ content: "This isn't for you!", ephemeral: true });
    }

    const selectedIndex = parseInt(interaction.values[0]);
    const { artist, album } = data[selectedIndex];

    const newPlay: PlayLog = {
      artist,
      album,
      listeners: [user.id],
      date: new Date(),
    };

    try {
      await processNewPlay(newPlay);

      await interaction.update({
        content: `✅ Logged a play for **${artist} - ${album}**`,
        components: [],
      });
    } catch (error: any) {
      await interaction.update({
        content: `❌ Error logging play: ${error.message}`,
        components: [],
      });
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      replyMessage.edit({ content: "Selection timed out.", components: [] }).catch(() => null);
    }
  });
};