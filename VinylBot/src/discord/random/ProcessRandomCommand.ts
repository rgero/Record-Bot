import { Message } from "discord.js";
import { ProcessRandomAlbum } from "./ProcessRandomAlbum.js";
import { ProcessRandomStore } from "./ProcessRandomStore.js";
import { parseCommand } from "../../utils/parseCommand.js";

export const ProcessRandomCommand = async (message: Message) => {
  const context = await parseCommand(message);
  if (!context) return;
  const { flags } = context;

  if (flags.length > 1) {
    await message.reply(`⚠️ Multiple flags detected. Please provide only one flag. Valid flags are --store, and --unplayed.`);
    return
  }

  if (flags.length === 1) {
    const flag = flags[0];
    switch (flag) {
      case "store":
        return await ProcessRandomStore(message);
      case "unplayed":
        return await ProcessRandomAlbum(message);
      default:
        await message.reply(`⚠️ Unknown flag: **${flag}**. Valid flags are --store and --unplayed.`);
        return;
    }
  }

  return await ProcessRandomAlbum(message);
}