import { ComponentType, Message } from "discord.js";
import { getUserById, getUserByName } from "../../services/users.api.js";
import { getVinyls, getVinylsByQuery, getVinylsByTags, getVinylsLikedByUserID } from "../../services/vinyls.api.js";

import { CommandContext } from "../../utils/parseCommand.js";
import { PlayLog } from "../../interfaces/PlayLog.js";
import { User } from "../../interfaces/User.js";
import { Vinyl } from "../../interfaces/Vinyl.js";
import { addPlayLog } from "../../services/plays.api.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";
import { buildAlbumEmbed, buildAlbumRow, getRandomItem, attachRandomAlbumCollector } from "./utils/randomAlbumUtils.js";

export const ProcessRandomLowAlbum = async (message: Message, context: CommandContext) => {
  try {
    const { mentions, flags, query } = context;
    if (mentions.length > 1) {
      await message.reply("❌ Can only have 1 mention");
      return;
    }

    const currentUserName = getDropdownValue(message.author.username);
    let targetUser: User | null = await getUserByName(currentUserName);
    let vinyls: Vinyl[] = [];
    let titleSuffix = "";

    if (flags.tags) {
      vinyls = await getVinylsByTags(flags.tags.toString().split(","));
      titleSuffix = "by Tags";
    } else if (mentions.length === 1) {
      const mentionedUser = await getUserById(mentions[0]);
      targetUser = mentionedUser || targetUser;
      titleSuffix = `liked by ${mentionedUser ? mentionedUser.name : "Unknown User"}`;
      if (mentionedUser) {
        vinyls = await getVinylsLikedByUserID(mentions[0]);
      }
    } else if (query) {
      vinyls = await getVinylsByQuery({ type: "search", term: query });
      titleSuffix = `matching "${query}"`;
    } else {
      vinyls = await getVinyls();
      titleSuffix = "(All Time)";
    }

    if (!vinyls || vinyls.length === 0) {
      const msg = query ? `❌ No entries found matching "${query}".` : "❌ The requested collection is empty.";
      return message.reply(msg);
    }

    const maxPlays = flags.limit !== undefined && !isNaN(Number(flags.limit)) ? Number(flags.limit) : undefined;
    let lowVinyls: Vinyl[];

    if (maxPlays !== undefined) {
      lowVinyls = vinyls.filter((vinyl) => (vinyl.playCount ?? 0) <= maxPlays);
      titleSuffix += ` <= ${maxPlays} plays`;
    } else {
      const minPlays = Math.min(...vinyls.map((vinyl) => vinyl.playCount ?? 0));
      lowVinyls = vinyls.filter((vinyl) => (vinyl.playCount ?? 0) === minPlays);
      titleSuffix += ` with ${minPlays} plays`;
    }

    if (!lowVinyls.length) {
      return message.reply(`⚠️ No low-play records found${titleSuffix ? ` ${titleSuffix}` : ""}.`);
    }

    if (!targetUser) {
      targetUser = await getUserByName(currentUserName);
      if (!targetUser) {
        return await message.reply("❌ No matching user profile found for logging.");
      }
    }

    let currentVinyl = getRandomItem(lowVinyls);
    const sentMessage = await message.reply({
      embeds: [buildAlbumEmbed(currentVinyl, `🎲 Random Low-Play Pick${titleSuffix ? ` ${titleSuffix}` : ""}`)],
      components: [buildAlbumRow({ showPlay: true })],
    });

    attachRandomAlbumCollector({
      sentMessage,
      message,
      getCurrentVinyl: () => currentVinyl,
      setCurrentVinyl: (vinyl) => {
        currentVinyl = vinyl;
      },
      vinyls: lowVinyls,
      title: `🎲 Random Low-Play Pick${titleSuffix ? ` ${titleSuffix}` : ""}`,
      targetUser: targetUser!,
    });
  } catch (err) {
    console.error("Error in ProcessRandomLowAlbum:", err);
    await message.reply("❌ An unexpected error occurred.");
  }
};