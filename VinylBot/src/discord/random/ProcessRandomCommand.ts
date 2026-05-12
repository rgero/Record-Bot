import { Message } from "discord.js";
import { ProcessRandomAlbum } from "./ProcessRandomAlbum.js";
import { ProcessRandomStore } from "./ProcessRandomStore.js";
import { parseCommand } from "../../utils/parseCommand.js";

export const ProcessRandomCommand = async (message: Message) => {
  const context = await parseCommand(message);
  if (!context) return;

  const { flags } = context;
  const activeFlags = Object.keys(flags).filter(key => flags[key] === true);

  if (activeFlags.length > 1) {
    await message.reply(
      `⚠️ Multiple flags detected (**${activeFlags.join(", ")}**). Please provide only one flag.`
    );
    return;
  }

  if (activeFlags.length === 1) {
    const flag = activeFlags[0];

    switch (flag) {
      case "store":
        return await ProcessRandomStore(message);
      case "unplayed":
        return await ProcessRandomAlbum(message, context);
      default:
        await message.reply(`⚠️ Unknown flag: --${flag}. Valid flags are --store, --tags, --unplayed.`);
        return;
    }
  }

  return await ProcessRandomAlbum(message, context);
};