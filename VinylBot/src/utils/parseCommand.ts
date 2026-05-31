import { Message } from "discord.js";
import { UUID } from "node:crypto";
import { getDropdownValue } from "./discordToDropdown.js";
import { resolveUserMap } from "./resolveUserMap.js";

const VALUE_FLAGS = ["sort", "limit", "tags", "number", "dir"];

export interface CommandContext {
  mentions: UUID[];
  flags: Record<string, string | boolean>;
  query: string;
}

export type ParseCommandResult = { ok: true; context: CommandContext } | { ok: false; error?: string };

export const parseCommand = async (message: Message): Promise<ParseCommandResult> => {
  const words = message.content.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { ok: false };

  const tokens = words.slice(1);
  let returnValue: CommandContext = {
    mentions: [],
    flags: {},
    query: ""
  };

  const userMap = await resolveUserMap();
  const discordMentions = message.mentions.users.filter(u => !u.bot);
  
  for (const mention of discordMentions.values()) {
    const name = getDropdownValue(mention.username).toLowerCase();
    const dbIds = userMap.get(name);
    if (dbIds?.[0]) {
      returnValue.mentions.push(dbIds[0] as UUID);
    }
  }

  const queryParts: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];

    if (token.startsWith("—")) {
      token = token.replace("—", "--");
    }

    if (token.startsWith("--")) {
      const flagName = token.replace("--", "").toLowerCase();
      const nextToken = tokens[i + 1];
      const expectsValue = VALUE_FLAGS.includes(flagName);

      if (expectsValue) {
        // ERROR HANDLING: Check if nextToken is missing or is another flag/mention
        if (!nextToken || nextToken.startsWith("--") || nextToken.startsWith("<@") || nextToken.startsWith("—")) {
          return {
            ok: false,
            error: `The flag \`--${flagName}\` requires an argument (e.g., \`--${flagName} value\`).`,
          };
        }

        returnValue.flags[flagName] = nextToken;
        i++; // Consume the argument
      } else {
        // Boolean flag
        returnValue.flags[flagName] = true;
      }
    } 
    else if (!token.match(/<@!?\d+>/)) {
      queryParts.push(token);
    }
  }

  returnValue.query = queryParts.join(" ").trim();
  return { ok: true, context: returnValue };
};