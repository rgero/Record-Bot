import { Message } from "discord.js";
import { UUID } from "node:crypto";
import { getDropdownValue } from "./discordToDropdown.js";
import { resolveUserMap } from "./resolveUserMap.js";

export interface CommandContext {
  mentions: UUID[];
  flags: string[];
  query: string;
}

export const parseCommand = async (message: Message): Promise<CommandContext | undefined> => {
  const words = message.content.split(/\s+/).filter(Boolean);
  const args = words.slice(1).join(" ").trim().replace("—", "--");

  let returnValue: CommandContext = {
    mentions: [],
    flags: [],
    query: args
  };

  // 1. Handle Mentions (User Mode)
  const mentions = message.mentions.users.filter(u => !u.bot);
  const userMap = await resolveUserMap();
  for (const mention of mentions.values()) {
    const name = getDropdownValue(mention.username).toLowerCase();
    const dbIds = userMap.get(name);
    if (dbIds && dbIds[0]) {
      returnValue.mentions.push(dbIds[0] as UUID);
    }
  }

  // 2. Handle Flags, that's anything that starts with -- or —
  const flagRegex = /(--|—)\w+/g;
  const flagMatches = args.match(flagRegex);
  if (flagMatches) {
    returnValue.flags = flagMatches.map(flag => flag.replace(/--|—/g, "").toLowerCase());
  }

  // 3. Handle any query. That's anything left that doesn't start with -- or — and isn't a mention
  const query = args.replace(flagRegex, "").replace(/<@!?\d+>/g, "").trim().replace(/\s+/g, " ");

  returnValue.query = query || ""; 

  return returnValue;
};
