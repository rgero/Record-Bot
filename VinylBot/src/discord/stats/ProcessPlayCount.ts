import { getSortedPlaysByQuery, getTopPlayedAlbumsByUserID } from "#services/plays.api.js";

import { EmbeddedResponse } from "#utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "#utils/escapeColons.js";
import { getNameById } from "#services/users.api.js";
import { getVinylsByPlayCount } from "#services/vinyls.api.js";
import { parseCommand } from "#utils/parseCommand.js";

export const ProcessPlayCount = async (message: Message) => {
  try {
    const context = await parseCommand(message);
    if (!context) return;
    let { mentions, query } = context;
    
    let list = [];
    let titleSuffix = "";

    // Mentions take precedence over search queries, so we check for those first
    if (mentions.length === 1) {
      const [userName, userList] = await Promise.all([getNameById(mentions[0]), getTopPlayedAlbumsByUserID(mentions[0])]);
      list = userList;
      titleSuffix = `for ${userName}`;
    } else if (query) {
        list = await getSortedPlaysByQuery(query);
        titleSuffix = `matching "${query}"`;
    } else {
        list = await getVinylsByPlayCount();
        titleSuffix = "(All Time)";
    }

    if (!list || list.length === 0) {
      return await message.reply(`⚠️ No plays found ${titleSuffix}.`);
    }

    await EmbeddedResponse({
      message,
      title: `Top Albums by Play Count ${titleSuffix}`.trim(),
      list,
      formatItem: (item, idx) => 
        `${idx + 1}. **${escapeColons(item.title)}** — ${item.count} plays`
    });

  } catch (error) {
    console.error("Error in ProcessPlayCount:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};