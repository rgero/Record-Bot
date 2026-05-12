import { EmbeddedResponse } from "../../utils/discord/EmbeddedResponse.js";
import { ItemCount } from "../../interfaces/ItemCount.js";
import { Message } from "discord.js";
import { escapeColons } from "../../utils/escapeColons.js";
import { getTopArtistsByPlay } from "../../services/plays.api.js";
import { parseCommand } from "../../utils/parseCommand.js";

export const ProcessTopArtists = async (message: Message) => {
  try {
    const context = await parseCommand(message);
    if (!context) return;
    let { mentions } = context;

    let list: ItemCount[] = [];
    if (mentions.length === 1) {
      list = await getTopArtistsByPlay(mentions[0]);
    } else {
      list = await getTopArtistsByPlay();
    }

    await EmbeddedResponse({
      message,
      title: `Top Artists by Play Count`.trim(),
      list,
      formatItem: (item, idx) =>
        `${idx + 1}. **${escapeColons(item.title)}** - ${item.count}`,
    });
  } catch (error) {
    console.error("Error in ProcessTop:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};
