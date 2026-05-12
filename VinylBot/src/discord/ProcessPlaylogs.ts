import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { GetPlaysList } from "../utils/GetPlaysList.js";
import { Message } from "discord.js";
import { escapeColons } from "../utils/escapeColons.js";
import { parseCommand } from "../utils/parseCommand.js";

export const ProcessPlaylogs = async (message: Message) => {
  const parsed = await parseCommand(message);
  if (!parsed.ok) {
    if (parsed.error) await message.reply(`❌ ${parsed.error}`);
    return;
  }
  const context = parsed.context;
  const { mentions, flags } = context;

  const list = await GetPlaysList(message, context);
  if (flags.count) {
    const count = list.length;
    return await message.reply(`🎶 You have ${count} total plays in your playlog!`);
  }

  let title = "Your Playlog";
  if (flags.all) {
    title = "All Playlogs";
  } else if (mentions && mentions.length > 0) {
    title = "Mentioned User's Playlogs";
  }

  return await EmbeddedResponse({
    message,
    title,
    list,
    formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)} (${item.id})`,
    color: 0x1db954,
  });
};
