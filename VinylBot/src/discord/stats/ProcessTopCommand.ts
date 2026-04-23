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

  if (flags.length > 1) {
    await message.reply(`⚠️ Multiple flags detected. Please provide only one flag. Valid flags are --artist, --locations, and --plays.`);
    return
  }

  if (flags.length === 1) {
    const flag = flags[0];
    switch (flag) {
      case "artist":
        return ProcessTopArtists(message);
      case "locations":
        return ProcessTopLocation(message);
      case "plays":
        return ProcessPlayCount(message);
      default:
        await message.reply(`⚠️ Unknown flag: **${flag}**. Valid flags are --artist, --locations, and --plays.`);
        return;
    }
  } else {
    return ProcessTop(message);
  }
}