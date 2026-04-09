import { ArtistCount } from "../../interfaces/ArtistCount.js";
import { EmbeddedResponse } from "../../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "../../utils/escapeColons.js";
import { getTopArtistsByPlay } from "../../services/plays.api.js";
import { parseCommand } from "../../utils/parseCommand.js";

export const ProcessTopArtists = async (message: Message) => {
  try {
    const context = await parseCommand(message);
    if (!context) return;
    let { type, term } = context;

    console.log(type, term);

    let list: ArtistCount[] = [];
    if (type === "user") {
      list = await getTopArtistsByPlay(term);
    } else {
      list = await getTopArtistsByPlay();
    }

    await EmbeddedResponse({
      message,
      title: `Top Artists by Play Count`.trim(),
      list,
      formatItem: (item, idx) =>
        `${idx + 1}. **${escapeColons(item.name)}** - ${item.count}`,
    });
  } catch (error) {
    console.error("Error in ProcessTop:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};
