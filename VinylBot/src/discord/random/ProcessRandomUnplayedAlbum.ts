import { ComponentType, Message } from "discord.js";
import { attachRandomAlbumCollector, buildAlbumEmbed, buildAlbumRow, getRandomItem } from "./utils/randomAlbumUtils.js";

import { CommandContext } from "../../utils/parseCommand.js";
import { PlayLog } from "../../interfaces/PlayLog.js";
import { User } from "../../interfaces/User.js";
import { Vinyl } from "../../interfaces/Vinyl.js";
import { addPlayLog } from "../../services/plays.api.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";
import { getUnplayedVinyls } from "../../services/vinyls.api.js";
import { getUserByName } from "../../services/users.api.js";

export const ProcessRandomUnplayedAlbum = async (message: Message, context: CommandContext) => {
  try {
    const { query, mentions } = context;

    if (mentions && mentions.length > 1) {
      await message.reply("❌ Can only have 1 mention");
      return;
    }

    const currentUserName = getDropdownValue(message.author.username, message.author.id);
    const targetUser: User | null = await getUserByName(currentUserName);

    if (!targetUser) {
      return message.reply("❌ No matching user profile found for logging.");
    }

    const vinyls = await getUnplayedVinyls(targetUser.id, query || undefined);
    const titleSuffix = "Random Pick from Your Unplayed";

    if (!vinyls || vinyls.length === 0) {
      const msg = query
        ? `❌ No entries found matching "${query}".`
        : "❌ The requested collection is empty.";
      return message.reply(msg);
    }

    let currentVinyl = getRandomItem(vinyls);
    const sentMessage = await message.reply({
      embeds: [buildAlbumEmbed(currentVinyl, titleSuffix)],
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
      title: titleSuffix,
      targetUser,
    });
  } catch (err) {
    console.error("Error in ProcessRandomUnplayedAlbum:", err);
    await message.reply("❌ An unexpected error occurred.");
  }
};
