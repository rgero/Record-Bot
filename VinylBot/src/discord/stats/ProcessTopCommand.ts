import { Message } from "discord.js";
import { ProcessPlayCount } from "./ProcessPlayCount.js";
import { ProcessTop } from "./ProcessTop.js";
import { ProcessTopArtists } from "./ProcessTopArtists.js";
import { ProcessTopLocation } from "./ProcessTopLocation.js";

export const ProcessTopCommand = async (message: Message) => {
  const args = message.content.slice(1).trim().split(/\s+/);
  switch (args[1]?.toLowerCase()) {
    case "plays":
      return await ProcessPlayCommandHandler(message);
    case "locations":
      return await ProcessTopLocation(message);
    default:
      return await ProcessTop(message);
  }
}

const ProcessPlayCommandHandler = async (message: Message) => {
  const flagRegex = /(--|—)\w+/g;
  const match = message.content.match(flagRegex);

  if (match) {
    const flag = match[0].replace(/--|—/g, "").toLowerCase();
    switch (flag) {
      case "artist":
        return ProcessTopArtists(message);
      case "album":
        return ProcessPlayCount(message);
      default:
        await message.reply(`⚠️ Unknown flag: **${flag}**. Valid flags are --artist and --album.`);
        return;
    }
  } else {
    return ProcessPlayCount(message);
  }
}