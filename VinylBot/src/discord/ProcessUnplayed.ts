import { CommandContext, parseCommand } from "../utils/parseCommand.js";

import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getUnplayedVinyls } from "../services/vinyls.api.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";

export const ProcessUnplayed = async (message: Message) => {
    const context = await parseCommand(message);
    if (!context) return;  
  
    const userMap = await resolveUserMap();
    const requesterName = getDropdownValue(message.author.username).toLowerCase();
    const requesterIds = userMap.get(requesterName);

    const {mentions, query} = context;

    if (mentions && mentions.length > 1)
    {
      await message.reply("❌ Can only have 1 mention");
    }

    if (!requesterIds) {
      console.warn(`User ${message.author.username} not found in database.`);
      return message.reply("⚠️ You are not registered in the system.");
    }

    const userID = requesterIds[0];

    try {
      const unplayedVinyls = await (await getUnplayedVinyls(userID, mentions[0], query)).sort( (a, b) => a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album) );

      if (unplayedVinyls && unplayedVinyls.length === 0) {
        return message.reply("🎉 You have no unplayed records! Well done!");
      }

      // Time to generate the response.
      await EmbeddedResponse({
        message,
        title: `Your Unplayed Vinyls (${unplayedVinyls.length} total)`,
        list: unplayedVinyls,
        formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)}`,
        color: 0x3498db,
      });

    } catch (error) { 
      console.error("Error processing unplayed vinyls:", error);
      return message.reply("❌ An error occurred while fetching your unplayed records.");
    }
  };