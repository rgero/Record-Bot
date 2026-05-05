import { Message } from "discord.js";
import { ProcessPlayCount } from "./ProcessPlayCount.js";
import { ProcessTop } from "./ProcessTop.js";
import { ProcessTopArtists } from "./ProcessTopArtists.js";
import { ProcessTopLocation } from "./ProcessTopLocation.js";
import { parseCommand } from "../../utils/parseCommand.js";

export const ProcessTopCommand = async (message: Message) => {
  const context = await parseCommand(message);
  if (!context) return;

  const { flags } = context;
  const activeFlags = Object.keys(flags).filter(key => flags[key] === true);

  if (activeFlags.length > 1) {
    await message.reply(
      `⚠️ Multiple flags detected (**${activeFlags.join(", ")}**). Please provide only one flag at a time.`
    );
    return;
  }

  if (activeFlags.length === 1) {
    const flag = activeFlags[0];

    switch (flag) {
      case "artist":
        return ProcessTopArtists(message);
      case "locations":
        return ProcessTopLocation(message);
      case "plays":
        return ProcessPlayCount(message);
      default:
        await message.reply(`⚠️ The flag --**${flag}** is not supported for this command.`);
        return;
    }
  }
  return ProcessTop(message);
};