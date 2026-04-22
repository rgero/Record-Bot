import { getLocationsByPurchaseCount, getLocationsByPurchaseCountForID } from "#services/locations.api.js";

import { AlbumCount } from "#interfaces/AlbumCount.js";
import { EmbeddedResponse } from "#utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "#utils/escapeColons.js";
import { getNameById } from "#services/users.api.js";
import { parseCommand } from "#utils/parseCommand.js";

export const ProcessTopLocation = async (message: Message) => {
  try {
    const context = await parseCommand(message);
    if (!context) return;
    let { mentions } = context;
    
    let list: AlbumCount[] = [];
    let titleSuffix = "";

    if (mentions.length === 1)
    {
      const [userName, userList] = await Promise.all([getNameById(mentions[0]),getLocationsByPurchaseCountForID(mentions[0])]);
      list = userList;
      titleSuffix = `for ${userName}`;
    } else {
      list = await getLocationsByPurchaseCount();
    }
    
    await EmbeddedResponse({
      message,
      title: `Top Locations by Album Count ${titleSuffix}`.trim(),
      list,
      formatItem: (item, idx) => 
        `${idx + 1}. **${escapeColons(item.title)}** - ${item.count}`
    });
  } catch (error) {
    console.error("Error in ProcessTopLocation:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};