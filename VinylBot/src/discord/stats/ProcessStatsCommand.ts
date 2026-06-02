import { Message } from "discord.js";
import { ProcessPlayCount } from "./ProcessPlayCount.js";
import { ProcessTop } from "./ProcessTop.js";
import { ProcessTopArtists } from "./ProcessTopArtists.js";
import { ProcessTopLocation } from "./ProcessTopLocation.js";
import { parseCommand } from "../../utils/parseCommand.js";

export const ProcessStatsCommand = async (message: Message) => {
  const parsed = await parseCommand(message);
  if (!parsed.ok) {
    if (parsed.error) await message.reply(`❌ ${parsed.error}`);
    return;
  }
  const context = parsed.context;

  const { flags } = context;
  const activeFlags = Object.keys(flags).filter((key) => flags[key] === true);

  if (activeFlags.length > 1) {
    await message.reply(`⚠️ Multiple flags detected (**${activeFlags.join(", ")}**). Please provide only one flag at a time.`);
    return;
  }

  if (activeFlags.length === 1) {
    const flag = activeFlags[0];

    switch (flag) {
      case "albums":
        return ProcessTop(message, context);
      case "artists":
        return ProcessTopArtists(message, context);
      case "locations":
        return ProcessTopLocation(message, context);
      case "plays":
        return ProcessPlayCount(message, context);
      default:
        await message.reply(`⚠️ The flag --**${flag}** is not supported for this command.`);
        return;
    }
  }
  return ProcessPlayCount(message, context);
};
