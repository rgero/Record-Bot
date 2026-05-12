import { getLocationsByPurchaseCount, getLocationsByPurchaseCountForID } from "../../services/locations.api.js";

import { EmbeddedResponse } from "../../utils/discord/EmbeddedResponse.js";
import { ItemCount } from "../../interfaces/ItemCount.js";
import { Message } from "discord.js";
import { CommandContext } from "../../utils/parseCommand.js";
import { escapeColons } from "../../utils/escapeColons.js";
import { getNameById } from "../../services/users.api.js";

export const ProcessTopLocation = async (message: Message, context: CommandContext) => {
  try {
    const { mentions } = context;

    let list: ItemCount[] = [];
    let titleSuffix = "";

    if (mentions.length === 1) {
      const [userName, userList] = await Promise.all([getNameById(mentions[0]), getLocationsByPurchaseCountForID(mentions[0])]);
      list = userList;
      titleSuffix = `for ${userName}`;
    } else {
      list = await getLocationsByPurchaseCount();
    }

    await EmbeddedResponse({
      message,
      title: `Top Locations by Album Count ${titleSuffix}`.trim(),
      list,
      formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.title)}** - ${item.count}`,
    });
  } catch (error) {
    console.error("Error in ProcessTopLocation:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};
