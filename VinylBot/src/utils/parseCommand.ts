import { Message } from "discord.js";
import { getDropdownValue } from "./discordToDropdown.js";
import { resolveUserMap } from "./resolveUserMap.js";

export interface CommandContext {
  type: "full" | "user" | "search" | "unplayed";
  term: string;
}

export const parseCommand = async (message: Message): Promise<CommandContext | undefined> => {
  const words = message.content.split(/\s+/).filter(Boolean);
  const command = words[0]?.toLowerCase();
  const args = words.slice(1).join(" ").trim().replace("—", "--");

  // Early Return for Unplayed, and future flags
  if (args.toLowerCase() === "--unplayed" && command === "!random") {
    return { type: "unplayed", term: "unplayed" };
  }

  // 1. Handle Mentions (User Mode)
  const mentions = message.mentions.users.filter(u => !u.bot);
  
  if (mentions.size > 0) {
    if (mentions.size > 1) {
      await message.reply("⚠️ Only one user can be mentioned at this time.");
      return undefined;
    }

    const userMap = await resolveUserMap();
    const user = mentions.first()!;
    const name = getDropdownValue(user.username).toLowerCase();
    const dbIds = userMap.get(name);

    if (dbIds && dbIds[0]) {
      return { type: "user", term: dbIds[0] };
    } else {
      await message.reply(`⚠️ I couldn't find a database entry for **${user.username}**.`);
      return undefined; 
    }
  }

  // 2. Handle Search or Full List
  if (!args) {
    return { type: "full", term: "" };
  }

  return { type: "search", term: args };
};