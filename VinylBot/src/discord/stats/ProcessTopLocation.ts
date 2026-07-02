import { getLocationsByPurchaseCount, getLocationsByPurchaseCountForID } from "../../services/locations.api.js";

import { CommandContext } from "../../utils/parseCommand.js";
import { EmbeddedResponse } from "../../utils/discord/EmbeddedResponse.js";
import { ItemCount } from "../../interfaces/ItemCount.js";
import { Message } from "discord.js";
import { escapeColons } from "../../utils/escapeColons.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";
import { getNameById } from "../../services/users.api.js";
import { resolveUserMap } from "../../utils/resolveUserMap.js";

export const ProcessTopLocation = async (message: Message, context: CommandContext) => {
  try {
    const { mentions, flags } = context;

    if (mentions.length > 1) {
      await message.reply("❌ Invalid usage. Please mention only one user.");
      return;
    }

    if (flags.mine && mentions.length === 1) {
      await message.reply("❌ Invalid usage. Use either --mine or mention a user, not both.");
      return;
    }

    let list: ItemCount[] = [];
    let titleSuffix = "";

    if (flags.mine) {
      const userMap = await resolveUserMap();
      const requesterName = getDropdownValue(message.author.username, message.author.id).toLowerCase();
      const requesterIds = userMap.get(requesterName);

      if (!requesterIds?.length) {
        await message.reply("⚠️ You are not registered or your Discord username could not be mapped to a user.");
        return;
      }

      const [userName, userList] = await Promise.all([
        getNameById(requesterIds[0]),
        getLocationsByPurchaseCountForID(requesterIds[0]),
      ]);
      list = userList;
      titleSuffix = `for ${userName}`;
    } else if (mentions.length === 1) {
      const [userName, userList] = await Promise.all([
        getNameById(mentions[0]),
        getLocationsByPurchaseCountForID(mentions[0]),
      ]);
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
