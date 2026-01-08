import { ActionRowBuilder, ComponentType, Message, MessageActionRowComponentBuilder, StringSelectMenuBuilder } from "discord.js";

import { PlayLog } from "../interfaces/PlayLog.js";
import { SearchResponse } from "../interfaces/SearchResponse.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getSpotifyData } from "../spotify/getSpotifyData.js";
import { getVinylsByQuery } from "../services/vinyls.api.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";
import { processNewPlay } from "../actions/processNewPlay.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";

export const ProcessPlay = async (message: Message) => {
  const userMap = await resolveUserMap();
  
  // 1. Identify requester
  const requesterName = getDropdownValue(message.author.username).toLowerCase();
  const requesterIds = userMap.get(requesterName);

  if (!requesterIds) {
    return message.reply("⚠️ You are not registered in the system.");
  }

  // 2. Identify mentioned listeners
  const listenerSet = new Set<string>(requesterIds);
  const mentions = message.mentions.users.filter(u => !u.bot);

  for (const [_, mention] of mentions) {
    const name = getDropdownValue(mention.username).toLowerCase();
    const dbIds = userMap.get(name);
    if (dbIds) {
      dbIds.forEach(id => listenerSet.add(id));
    }
  }

  const listenerIDs = Array.from(listenerSet);
  const listenerCount = listenerIDs.length;

  // 3. Clean search params
  const params = message.content.split(" ").slice(1).join(" ").replace(/<@!?\d+>/g, "").trim();
  if (!params) return message.reply("Please provide an album name or Spotify URL.");

  // --- CASE 1: SPOTIFY ---
  const spotify = parseSpotifyUrl(params);
  if (spotify) {
    try {
      const { artists, albumName } = await getSpotifyData(spotify);
      const newPlay: PlayLog = { artist: artists, album: albumName, listeners: listenerIDs, date: new Date() };
      await processNewPlay(newPlay);
      return message.reply(`✅ Logged for **${artists}** - **${albumName}** for ${listenerCount} listener${listenerCount === 1 ? "" : "s"}`);
    } catch (e: any) { return message.reply(`❌ Spotify error: ${e.message}`); }
  }

  // --- CASE 2: MANUAL SEARCH ---
  let data = await getVinylsByQuery({ type: "search", term: params });
  if (data.length === 0) return message.reply("No matching albums found!");

  if (data.length === 1) {
    const res: SearchResponse = data[0];
    try {
      const newPlay: PlayLog = { artist: res.artist, album: res.album, listeners: listenerIDs, date: new Date() };
      await processNewPlay(newPlay);
      return message.reply(`✅ Logged **${res.artist}** - **${res.album}** for ${listenerCount} listener${listenerCount === 1 ? "" : "s"}`);
    } catch (e: any) { return message.reply(`❌ Error: ${e.message}`); }
  }

  // --- CASE 3: DROPDOWN ---
  const options = data.slice(0, 25).map((row, i) => ({
    label: `${row.artist.slice(0, 40)} - ${row.album.slice(0, 40)}`,
    value: i.toString(),
  }));

  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new StringSelectMenuBuilder().setCustomId("select_album").setPlaceholder("Choose an album...").addOptions(options)
  );

  const reply = await message.reply({ content: `Multiple matches found (${listenerCount} listener${listenerCount === 1 ? "" : "s"}):`, components: [row] });

  const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1, time: 60000 });

  collector.on("collect", async (int) => {
    if (int.user.id !== message.author.id) return int.reply({ content: "Not for you!", ephemeral: true });
    const { artist, album } = data[parseInt(int.values[0])];
    try {
      await processNewPlay({ artist, album, listeners: listenerIDs, date: new Date() });
      await int.update({ content: `✅ Logged **${artist}** - **${album}** for ${listenerCount} listener${listenerCount === 1 ? "" : "s"}`, components: [] });
    } catch (e: any) { await int.update({ content: `❌ Error: ${e.message}`, components: [] }); }
  });
};