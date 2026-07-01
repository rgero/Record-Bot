import { EmbeddedResponse } from "../../utils/discord/EmbeddedResponse.js";
import { ItemCount } from "../../interfaces/ItemCount.js";
import { Message } from "discord.js";
import { CommandContext } from "../../utils/parseCommand.js";
import { escapeColons } from "../../utils/escapeColons.js";
import { getTopArtistsByPlay } from "../../services/plays.api.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";
import { resolveUserMap } from "../../utils/resolveUserMap.js";

export const ProcessTopArtists = async (message: Message, context: CommandContext) => {
  try {
    const { mentions, flags } = context;

    if (mentions.length > 1) {
      await message.reply("❌ Invalid usage. Please mention only one user or leave the command empty.");
      return;
    }

    if (flags.mine && mentions.length === 1) {
      await message.reply("❌ Invalid usage. Use either --mine or mention a user, not both.");
      return;
    }

    let list: ItemCount[] = [];
    if (flags.mine) {
      const userMap = await resolveUserMap();
      const requesterName = getDropdownValue(message.author.username, message.author.id, message.author.globalName).toLowerCase();
      const requesterIds = userMap.get(requesterName);

      if (!requesterIds?.length) {
        await message.reply("⚠️ You are not registered or your Discord username could not be mapped to a user.");
        return;
      }

      list = await getTopArtistsByPlay(requesterIds[0]);
    } else if (mentions.length === 1) {
      list = await getTopArtistsByPlay(mentions[0]);
    } else {
      list = await getTopArtistsByPlay();
    }

    await EmbeddedResponse({
      message,
      title: `Top Artists by Play Count`.trim(),
      list,
      formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.title)}** - ${item.count}`,
    });
  } catch (error) {
    console.error("Error in ProcessTop:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};
