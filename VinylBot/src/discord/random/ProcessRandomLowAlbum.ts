import { attachRandomAlbumCollector, buildAlbumEmbed, buildAlbumRow, getRandomItem } from "./utils/randomAlbumUtils.js";
import { getUserById, getUserByName } from "../../services/users.api.js";
import { getVinyls, getVinylsByQuery, getVinylsByTags, getVinylsLikedByUserID } from "../../services/vinyls.api.js";

import { CommandContext } from "../../utils/parseCommand.js";
import { Message } from "discord.js";
import { UUID } from "crypto";
import { User } from "../../interfaces/User.js";
import { Vinyl } from "../../interfaces/Vinyl.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";
import { getPlaylogsByUserIDs } from "../../services/plays.api.js";

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
      if (flags.mine) {
        await message.reply("❌ Invalid usage. Use either --mine or mention a user, not both.");
        return;
      }

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

    const mineMode = Boolean(flags.mine);
    let userPlayCounts: Record<string, number> = {};

    if (mineMode) {
      if (!targetUser) {
        return await message.reply("❌ No matching user profile found for logging.");
      }

      const playlogs = await getPlaylogsByUserIDs([targetUser.id as UUID]);
      userPlayCounts = playlogs.reduce((counts: Record<string, number>, playlog) => {
        const albumId = String(playlog.album_id);
        counts[albumId] = (counts[albumId] || 0) + 1;
        return counts;
      }, {});
    }

    // Lambda function to get the playcount quickly.
    const getPlayCount = (vinyl: Vinyl) => (mineMode ? userPlayCounts[String(vinyl.id)] ?? 0 : vinyl.playCount ?? 0);

    if (maxPlays !== undefined) {
      lowVinyls = vinyls.filter((vinyl) => getPlayCount(vinyl) <= maxPlays);
      titleSuffix += ` <= ${maxPlays} plays`;
    } else {
      const playCounts = vinyls.map(getPlayCount);
      const positivePlayCounts = playCounts.filter((count) => count > 0);
      const minPlays = positivePlayCounts.length > 0 ? Math.min(...positivePlayCounts) : 0;
      lowVinyls = vinyls.filter((vinyl) => getPlayCount(vinyl) <= minPlays);
      titleSuffix += ` with <= ${minPlays} plays`;
    }

    if (mineMode) {
      titleSuffix += " (mine)";
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