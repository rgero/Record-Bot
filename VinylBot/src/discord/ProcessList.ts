import { getVinylsByQuery, getVinylsByTags } from "#services/vinyls.api.js";

import { EmbeddedResponse } from "#utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "#utils/escapeColons.js";
import { getNameById } from "#services/users.api.js";
import { getWantList } from "#services/wantlist.api.js";
import { parseCommand } from "#utils/parseCommand.js";

export const ProcessList = async (message: Message, listType: 'want' | 'have' | 'tag') => {
  let context = await parseCommand(message);
  if (!context) return;
  const { mentions, query } = context;

  let type: "full" | "user" | "search" = "full";
  let term = "";

  try {
    let displayTerm; 
    if (mentions.length == 1) {
      const resolvedName = await getNameById(mentions[0]);
      displayTerm = resolvedName ?? "Unknown User";
      term= mentions[0] ?? "";
      type = "user";
    } else if (query) {
      type = "search";
      displayTerm = query;
      term = query;
    }

    let list;
    let listName = "Collection"
    switch(listType) {
      case 'have':
        list = await getVinylsByQuery({ type, term });
        break;
      case 'tag':
        const tagList = term.split(",")
        list = await getVinylsByTags(tagList);
        break;
      default:
        listName = "Want List"
        list = await getWantList({type, term})
    }

    const title = type === "full" ? `The ${listName}` : `${listName} matches for "${displayTerm}"`;

    await EmbeddedResponse({
      message,
      title,
      list,
      formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)}`,
      color: listType === "want" ? 0x3498db : 0x1db954,
    });

  } catch (error) {
    console.error("Error in ProcessList:", error);
    await message.reply("⚠️ An error occurred while fetching the list from the database.");
  }
};