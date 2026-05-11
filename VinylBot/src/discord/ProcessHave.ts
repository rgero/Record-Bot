import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { VinylSearchQuery } from "../interfaces/VinylSearchQuery.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getVinylsBySearchQuery } from "../services/vinyls.api.js";
import { parseCommand } from "../utils/parseCommand.js";

export const ProcessHave = async (message: Message) => {
    let context = await parseCommand(message);
    if (!context) return;
    const { mentions, query, flags } = context;

    const searchQuery: VinylSearchQuery = {
      owners: mentions.length > 0 ? mentions : undefined,
      search: query ? query.toLowerCase() : undefined,
      tags: flags["tags"] && typeof flags["tags"] === 'string' ? flags["tags"].split(",").map((t: string) => t.toLowerCase()) : undefined,
    }

    try {
      const list = await getVinylsBySearchQuery(searchQuery);
      const title = `The Have List - ${list.length} vinyl(s) found`;

      return await EmbeddedResponse({
            message,
            title,
            list,
            formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)}`,
            color: 0x1db954,
          });

    } catch (error) {
      console.error("Error occurred while fetching vinyls:", error);
    }

}