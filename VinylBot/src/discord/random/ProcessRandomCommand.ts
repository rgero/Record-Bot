import { Message } from "discord.js";
import { ProcessRandomAlbum } from "./ProcessRandomAlbum.js";
import { ProcessRandomLowAlbum } from "./ProcessRandomLowAlbum.js";
import { ProcessRandomStore } from "./ProcessRandomStore.js";
import { ProcessRandomUnplayedAlbum } from "./ProcessRandomUnplayedAlbum.js";
import { parseCommand } from "../../utils/parseCommand.js";

export const ProcessRandomCommand = async (message: Message) => {
  const parsed = await parseCommand(message);
  if (!parsed.ok) {
    if (parsed.error) await message.reply(`❌ ${parsed.error}`);
    return;
  }
  const context = parsed.context;

  const { flags } = context;
  const primaryFlags = ["low", "store", "unplayed"];
  const activePrimaryFlags = Object.keys(flags).filter(
    (key) => primaryFlags.includes(key) && Boolean(flags[key])
  );

  if (activePrimaryFlags.length > 1) {
    await message.reply(
      `⚠️ Multiple primary flags detected (**${activePrimaryFlags.join(", ")}**). Please provide only one primary flag.`
    );
    return;
  }

  if (activePrimaryFlags.length === 1) {
    const flag = activePrimaryFlags[0];

    switch (flag) {
      case "low":
        return await ProcessRandomLowAlbum(message, context);
      case "store":
        return await ProcessRandomStore(message);
      case "unplayed":
        return await ProcessRandomUnplayedAlbum(message, context);
      default:
        await message.reply(`⚠️ Unknown primary flag: --${flag}. Valid primary flags are --store, --unplayed, --low.`);
        return;
    }
  }

  return await ProcessRandomAlbum(message, context);
};
