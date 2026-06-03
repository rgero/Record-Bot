import { sortItems, validSorts } from "../utils/sortItems.js";

import { BaseVinyl } from "../interfaces/BaseVinyl.js";
import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getNameById } from "../services/users.api.js";
import { getVinylsByTags } from "../services/vinyls.api.js";
import { getWantList } from "../services/wantlist.api.js";
import { parseCommand } from "../utils/parseCommand.js";

export const ProcessList = async (message: Message, listType: "want" | "tag") => {
  try {
    const parsed = await parseCommand(message);
    if (!parsed.ok) {
      if (parsed.error) await message.reply(`❌ ${parsed.error}`);
      return;
    }
    const { mentions, flags, query } = parsed.context;

    let type: "full" | "user" | "search" = "full";
    let term = "";

    let displayTerm: string | undefined;
    if (mentions.length == 1) {
      const resolvedName = await getNameById(mentions[0]);
      displayTerm = resolvedName ?? "Unknown User";
      term = mentions[0] ?? "";
      type = "user";
    } else if (query) {
      type = "search";
      displayTerm = query;
      term = query;
    }

    let sort = "artist+";
    if (flags.sort && typeof flags.sort === "string") {
      if (validSorts.includes(flags.sort)) {
        sort = flags.sort;
      }
    }

    let list: BaseVinyl[] = [];
    let listName = "Collection";
    switch (listType) {
      case "tag": {
        const tagList = term.split(",");
        list = sortItems(await getVinylsByTags(tagList), sort);
        break;
      }
      default:
        listName = "Want List";
        list = sortItems(await getWantList({ type, term }), sort);
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
