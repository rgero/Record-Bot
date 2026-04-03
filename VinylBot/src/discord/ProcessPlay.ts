import { ActionRowBuilder, ComponentType, Message, MessageActionRowComponentBuilder, StringSelectMenuBuilder } from "discord.js";
import { getVinylID, getVinylsByQuery } from "../services/vinyls.api.js";

import { PlayLog } from "../interfaces/PlayLog.js";
import { SearchResponse } from "../interfaces/SearchResponse.js";
import { addPlayLog } from "../services/plays.api.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getSpotifyData } from "../spotify/getSpotifyData.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";

async function resolveVinylId(artist: string, album: string): Promise<number> {
  const vinylId = await getVinylID(artist, album); // Uses vinyls.api.ts
  if (!vinylId) {
    throw new Error(`The album **${escapeColons(album)}** by **${escapeColons(artist)}** was not found in your collection.`);
  }
  return vinylId;
}

export const ProcessPlay = async (message: Message) => {
  const userMap = await resolveUserMap();
  
  // 1. Identify requester
  const requesterName = getDropdownValue(message.author.username).toLowerCase();
  const requesterIds = userMap.get(requesterName);

  if (!requesterIds) {
    console.warn(`User ${message.author.username} not found in database.`);
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
      
      // Resolve string names to the database ID
      const album_id = await resolveVinylId(artists, albumName);

      const newPlay: PlayLog = { 
        album_id, 
        listeners: listenerIDs, 
        date: new Date(),
        artist: artists, // Kept for reply message display
        album: albumName 
      };

      await addPlayLog(newPlay);
      return message.reply(`✅ Logged for **${artists}** - **${albumName}** for ${listenerCount} listener${listenerCount === 1 ? "" : "s"}`);
    } catch (e: any) { 
        return message.reply(`❌ ${e.message}`); 
    }
  }

  // --- CASE 2: MANUAL SEARCH ---
  let data = await getVinylsByQuery({ type: "search", term: params });
  if (data.length === 0) return message.reply("No matching albums found!");

  if (data.length === 1) {
    const res: SearchResponse = data[0];
    try {
      if (!res.id) {throw new Error("Search Response does not have ID")}
      const newPlay: PlayLog = { 
        album_id: res.id,
        listeners: listenerIDs, 
        date: new Date(),
        artist: res.artist,
        album: res.album
      };
      await addPlayLog(newPlay);
      return message.reply(`✅ Logged **${escapeColons(res.artist)}** - **${escapeColons(res.album)}** for ${listenerCount} listener${listenerCount === 1 ? "" : "s"}`);
    } catch (e: any) { 
        return message.reply(`❌ Error: ${e.message}`); 
    }
  }

  // --- CASE 3: DROPDOWN ---
  const options = data.slice(0, 25).map((row, i) => ({
    label: `${row.artist.slice(0, 40)} - ${row.album.slice(0, 40)}`,
    value: i.toString(),
  }));

  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new StringSelectMenuBuilder().setCustomId("select_album").setPlaceholder("Choose an album...").addOptions(options)
  );

  const reply = await message.reply({ 
    content: `Multiple matches found (${listenerCount} listener${listenerCount === 1 ? "" : "s"}):`, 
    components: [row] 
  });

  const collector = reply.createMessageComponentCollector({ 
    componentType: ComponentType.StringSelect, 
    max: 1, 
    time: 60000 
  });

  collector.on("collect", async (int) => {
    if (int.user.id !== message.author.id) return int.reply({ content: "Not for you!", ephemeral: true });
    
    const selected = data[parseInt(int.values[0])];
    const { artist, album, id: album_id } = selected;

    try {
      if (!album_id) {throw new Error("Search Response does not have ID")}
      await addPlayLog({ 
        album_id, 
        listeners: listenerIDs, 
        date: new Date(),
        artist,
        album 
      });
      await int.update({ 
        content: `✅ Logged **${escapeColons(artist)}** - **${escapeColons(album)}** for ${listenerCount} listener${listenerCount === 1 ? "" : "s"}`, 
        components: [] 
      });
    } catch (e: any) { 
        await int.update({ content: `❌ Error: ${e.message}`, components: [] }); 
    }
  });
};