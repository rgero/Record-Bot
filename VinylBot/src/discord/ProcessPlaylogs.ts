import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse";
import { GetPlaysList } from "../utils/GetPlaysList";
import { Message } from "discord.js";
import { ProcessList } from "./ProcessList";
import { escapeColons } from "../utils/escapeColons";
import { parseCommand } from "../utils/parseCommand";

export const ProcessPlaylogs = async (message: Message) => {
    let context = await parseCommand(message);
    if (!context) return;

    let { flags } = context;

    let list = await GetPlaysList(message);
    if (flags.count)
    {
      const count = list.length;  
      return await message.reply(`🎶 You have ${count} total plays in your playlog!`);      
    }

    const title = "Your Playlog";

    return await EmbeddedResponse({
      message,
      title,
      list,
      formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)}`,
      color: 0x1db954,
    });
}