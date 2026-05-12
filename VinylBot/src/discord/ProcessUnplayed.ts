import { CommandContext, parseCommand } from "../utils/parseCommand.js";
import { getUnplayedVinylCounts, getUnplayedVinyls } from "../services/vinyls.api.js";

import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { UUID } from "node:crypto";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getNameById } from "../services/users.api.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";
import { validSorts } from "../utils/sortVinyls.js";

export const ProcessUnplayed = async (message: Message) => {
  const parsed = await parseCommand(message);
  if (!parsed.ok) {
    if (parsed.error) await message.reply(`❌ ${parsed.error}`);
    return;
  }
  const context: CommandContext = parsed.context;

  const { mentions, query, flags } = context;
  const userMap = await resolveUserMap();

  const requesterName = getDropdownValue(message.author.username).toLowerCase();
  const requesterIds = userMap.get(requesterName) as UUID[] | undefined;

  const targetIDs: UUID[] = mentions && mentions.length > 0 ? (mentions as UUID[]) : requesterIds || [];

  if (targetIDs.length === 0) {
    return message.reply("⚠️ You are not registered or no users were found.");
  }

  try {
    if (flags.count) {
      const rawData = await getUnplayedVinylCounts(targetIDs);
      const namedData = await Promise.all(
        rawData.map(async (item) => ({
          userName: await getNameById(item.title),
          count: item.count,
        }))
      );

      return await EmbeddedResponse({
        message,
        title: `Unplayed Vinyl Counts`,
        list: namedData,
        formatItem: (item, idx) => `${idx + 1}. **${item.userName}** - ${item.count} records`,
        color: 0x3498db,
      });
    }

    if (mentions && mentions.length > 1) {
      return message.reply("❌ Please mention only one user to see a detailed list.");
    }

    let sort = "artist+";
    if (flags.sort && typeof flags.sort === "string") {
      if (validSorts.includes(flags.sort)) {
        sort = flags.sort;
      }
    }

    const userID = targetIDs[0];
    const data = await getUnplayedVinyls(userID, mentions[0], query, sort);

    if (!data || data.length === 0) {
      return message.reply("🎉 No unplayed records found!");
    }

    return await EmbeddedResponse({
      message,
      title: `Unplayed Vinyls (${data.length} total)`,
      list: data,
      formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)}`,
      color: 0x3498db,
    });
  } catch (error) {
    console.error("ProcessUnplayed Error:", error);
    return message.reply("❌ An error occurred while fetching vinyl data.");
  }
};
