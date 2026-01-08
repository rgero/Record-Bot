import { getUserByName } from "../services/users.api.js";
import { isInList } from "./userParser.js";

export interface CommandContext {
  type: "full" | "user" | "search";
  term: string;
}

export const parseCommand = async (messageArgs: string): Promise<CommandContext> => {
  // Split by whitespace and remove empty strings
  const words = messageArgs.split(/\s+/).filter(Boolean);

  // Case 1: "!have" or "!wantlist" (No arguments)
  if (words.length === 0) {
    return { type: "full", term: "" };
  }

  // Case 2: "!have @username" (One argument that matches a known user)
  // Your 'isInList' utility checks if the word exists in your defined users list
  if (words.length === 1 && isInList(words[0])) {
    const user = await getUserByName(words[0]);
    if (!user) 
    {
      throw new Error("Error parsing User");
    }
    return { type: "user", term: user.id };
  }

  // Case 3: "!have Radiohead" (Search term)
  return { type: "search", term: messageArgs };
};