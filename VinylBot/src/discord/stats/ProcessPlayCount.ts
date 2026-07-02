import { getSortedPlaysByQuery, getTopPlayedAlbumsByUserID } from "../../services/plays.api.js";

import { CommandContext } from "../../utils/parseCommand.js";
import { EmbeddedResponse } from "../../utils/discord/EmbeddedResponse.js";
import { ItemCount } from "../../interfaces/ItemCount.js";
import { Message } from "discord.js";
import { escapeColons } from "../../utils/escapeColons.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";
import { getNameById } from "../../services/users.api.js";
import { getVinylsByPlayCount } from "../../services/vinyls.api.js";
import { resolveUserMap } from "../../utils/resolveUserMap.js";

export const ProcessPlayCount = async (message: Message, context: CommandContext) => {
  try {
    const { mentions, query, flags } = context;
    const isMine = Boolean(flags.mine);

    if (mentions.length > 1) {
      await message.reply("❌ Invalid usage. Please mention only one user.");
      return;
    }

    if (isMine && mentions.length === 1) {
      await message.reply("❌ Invalid usage. Use either --mine or mention a user, not both.");
      return;
    }

    let list: ItemCount[] = [];
    let titleSuffix = "";
    let shouldFilterQuery = false;

    if (isMine) {
      const userMap = await resolveUserMap();
      const requesterName = getDropdownValue(message.author.username, message.author.id).toLowerCase();
      const requesterIds = userMap.get(requesterName);

      if (!requesterIds?.length) {
        await message.reply("⚠️ You are not registered or your Discord username could not be mapped to a user.");
        return;
      }

      list = await getTopPlayedAlbumsByUserID(requesterIds[0]);
      titleSuffix = "for your plays";
      shouldFilterQuery = Boolean(query);
    } else if (mentions.length === 1) {
      const [userName, userList] = await Promise.all([
        getNameById(mentions[0]),
        getTopPlayedAlbumsByUserID(mentions[0]),
      ]);

      list = userList;
      titleSuffix = `for ${userName}`;
      shouldFilterQuery = Boolean(query);
    } else if (query) {
      list = await getSortedPlaysByQuery(query);
      titleSuffix = `matching "${query}"`;
    } else {
      list = await getVinylsByPlayCount();
      titleSuffix = "(All Time)";
    }

    if (shouldFilterQuery) {
      const normalizedQuery = query.toLowerCase();
      list = list.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
      titleSuffix += ` matching "${query}"`;
    }

    let needReverse = false;
    if (flags["dir"] === "asc") {
      list.reverse();
      needReverse = true;
      titleSuffix += " (Ascending)";
    }

    if (flags["count"] !== undefined && !isNaN(Number(flags["count"]))) {
      const targetCount = Number(flags["count"]);
      list = list.filter((item) =>
        needReverse ? item.count <= targetCount : item.count >= targetCount
      );
    }

    if (!list || list.length === 0) {
      return await message.reply(`⚠️ No plays found ${titleSuffix}.`);
    }

    await EmbeddedResponse({
      message,
      title: `Top Albums by Play Count ${titleSuffix}`.trim(),
      list,
      formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.title)}** — ${item.count} plays`,
    });
  } catch (error) {
    console.error("Error in ProcessPlayCount:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};
