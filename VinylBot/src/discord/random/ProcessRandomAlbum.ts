import { ComponentType, Message } from "discord.js";
import { attachRandomAlbumCollector, buildAlbumEmbed, buildAlbumRow, getRandomItem } from "./utils/randomAlbumUtils.js";
import { getUserById, getUserByName } from "../../services/users.api.js";
import { getVinyls, getVinylsByQuery, getVinylsByTags, getVinylsLikedByUserID } from "../../services/vinyls.api.js";

import { CommandContext } from "../../utils/parseCommand.js";
import { PlayLog } from "../../interfaces/PlayLog.js";
import { User } from "../../interfaces/User.js";
import { Vinyl } from "../../interfaces/Vinyl.js";
import { addPlayLog } from "../../services/plays.api.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";

export const ProcessRandomAlbum = async (message: Message, context: CommandContext) => {
  try {
    const { mentions, flags, query } = context;

    let targetUser: User | null = null;
    let vinyls: Vinyl[] = [];

    let titleSuffix = "";

    if (mentions && mentions.length > 1) {
      await message.reply("❌ Can only have 1 mention");
      return;
    }

    targetUser = await getUserByName(getDropdownValue(message.author.username, message.author.id));
    if (flags.tags) {
      vinyls = await getVinylsByTags(flags.tags.toString().split(','))
      titleSuffix = "by Tags"
    } else if (mentions.length === 1) {
      targetUser = await getUserById(mentions[0]); 
      titleSuffix = `liked by ${targetUser ? targetUser.name : "Unknown User"}`;
      if (targetUser) {
        vinyls = await getVinylsLikedByUserID(mentions[0]);
      }
    } else if (query) {
      vinyls = await getVinylsByQuery({ type: "search", term: query });
      targetUser = await getUserByName(getDropdownValue(message.author.username, message.author.id));
    } else {
      vinyls = await getVinyls();
      targetUser = await getUserByName(getDropdownValue(message.author.username, message.author.id));
    }

    if (!targetUser) {
      return message.reply("❌ No matching user profile found for logging.");
    }

    if (!vinyls || vinyls.length === 0) {
      const msg = query ? `❌ No entries found matching "${query}".` : "❌ The requested collection is empty.";
      return message.reply(msg);
    }

    let currentVinyl = getRandomItem(vinyls);
    const sentMessage = await message.reply({
      embeds: [buildAlbumEmbed(currentVinyl, `🎲 Random Pick${titleSuffix ? ` ${titleSuffix}` : ""}`)],
      components: [buildAlbumRow({ showPlay: true })],
    });

    attachRandomAlbumCollector({
      sentMessage,
      message,
      getCurrentVinyl: () => currentVinyl,
      setCurrentVinyl: (vinyl) => {
        currentVinyl = vinyl;
      },
      vinyls,
      title: `🎲 Random Pick${titleSuffix ? ` ${titleSuffix}` : ""}`,
      targetUser: targetUser!,
    });

  } catch (err) {
    console.error("Error in ProcessRandomAlbum:", err);
    await message.reply("❌ An unexpected error occurred.");
  }
};