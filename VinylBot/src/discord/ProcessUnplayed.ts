import { CommandContext, parseCommand } from "../utils/parseCommand.js";
import { getUnplayedVinylCounts, getUnplayedVinyls } from "../services/vinyls.api.js";

import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { UUID } from "node:crypto";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getNameById } from "../services/users.api.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";

export const ProcessUnplayed = async (message: Message) => {
  const context: CommandContext|undefined = await parseCommand(message);
  if (!context) return;

  const { mentions, query, flags } = context;
  const userMap = await resolveUserMap();
  
  const requesterName = getDropdownValue(message.author.username).toLowerCase();
  const requesterIds = userMap.get(requesterName) as UUID[] | undefined;

  const targetIDs: UUID[] = (mentions && mentions.length > 0) ? (mentions as UUID[]) : (requesterIds || []);

  if (targetIDs.length === 0) {
    return message.reply("⚠️ You are not registered or no users were found.");
  }

  try {
    if (flags.count) {
      const rawData = await getUnplayedVinylCounts(targetIDs);
      const namedData = await Promise.all(
        rawData.map(async (item) => ({
          userName: await getNameById(item.user_id), 
          count: item.unplayed_count
        }))
      );

      return await EmbeddedResponse({
        message,
        title: `Unplayed Vinyl Counts`,
        list: namedData,
        formatItem: (item, idx) => `${idx + 1}. **${item.userName}** — ${item.count} records`,
        color: 0x3498db,
      });
    }

    if (mentions && mentions.length > 1) {
      return message.reply("❌ Please mention only one user to see a detailed list.");
    }

    const userID = targetIDs[0];
    const data = await getUnplayedVinyls(userID, mentions[0], query);

    if (!data || data.length === 0) {
      return message.reply("🎉 No unplayed records found!");
    }

    const sortedVinyls = data.sort((a, b) => 
      a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album)
    );

    return await EmbeddedResponse({
      message,
      title: `Unplayed Vinyls (${sortedVinyls.length} total)`,
      list: sortedVinyls,
      formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)}`,
      color: 0x3498db,
    });

  } catch (error) {
    console.error("ProcessUnplayed Error:", error);
    return message.reply("❌ An error occurred while fetching vinyl data.");
  }
};