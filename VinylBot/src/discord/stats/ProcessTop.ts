import { getArtistVinylCountByUserId, getArtistVinylCounts } from "#services/vinyls.api.js";

import { AlbumCount } from "#interfaces/AlbumCount.js";
import { EmbeddedResponse } from "#utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "#utils/escapeColons.js";
import { getNameById } from "#services/users.api.js";
import { parseCommand } from "#utils/parseCommand.js";

export const ProcessTop = async (message: Message) => {
  try {
    const context = await parseCommand(message);
    if (!context) return;
    const {mentions, query} = context;

    if (mentions.length > 1) {
      await message.reply("❌ Invalid usage. Please mention only one user or leave the command empty.");
      return;
    } else if (query) {
      await message.reply("❌ Invalid usage. This command does not accept search queries. Please mention a user or leave the command empty.");
      return;
    }

    let list: AlbumCount[] = [];
    let titleSuffix = "";

    if (mentions.length === 1) {
      const [userName, userList] = await Promise.all([
        getNameById(mentions[0]),
        getArtistVinylCountByUserId(mentions[0]),
      ]);

      list = userList;
      titleSuffix = `for ${userName}`;
    } else {
      list = await getArtistVinylCounts();
    }

    await EmbeddedResponse({
      message,
      title: `Top Artists by Album Count ${titleSuffix}`.trim(),
      list,
      formatItem: (item, idx) =>
        `${idx + 1}. **${escapeColons(item.title)}** - ${item.count}`,
    });
  } catch (error) {
    console.error("Error in ProcessTop:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};
