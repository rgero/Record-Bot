import fs from "fs";
import path from "path";

type MappingValue = string | {
      displayName?: string;
      discordId?: string;
      usernames?: string[];
};

type DiscordMapping = Record<string, MappingValue>;

const normalizeHandle = (value: string | null | undefined): string =>
  (value ?? "").trim().replace(/^@/, "").replace(/^\./, "").toLowerCase();

const readDiscordMapping = (): DiscordMapping => {
  try {
    const data = fs.readFileSync(path.resolve("./discordMapping.json"), "utf8");
    return JSON.parse(data) as DiscordMapping;
  } catch (err) {
    console.error("Failed to load discordMapping.json", err);
    return {};
  }
};

export const isAuthorizedDirectMessageUser = (author: {
  id: string;
  username: string;
  globalName?: string | null;
}): boolean => {
  const mapping = readDiscordMapping();
  const username = normalizeHandle(author.username);
  const globalName = normalizeHandle(author.globalName);

  for (const [mappedUsername, mappedValue] of Object.entries(mapping)) {
    if (typeof mappedValue === "string") {
      const mappedNormalized = normalizeHandle(mappedUsername);
      if (mappedNormalized === username || (globalName && mappedNormalized === globalName)) {
        return true;
      }
      continue;
    }

    if (mappedValue.discordId && mappedValue.discordId === author.id) {
      return true;
    }

    const candidates = [mappedUsername, ...(mappedValue.usernames ?? [])]
      .map(normalizeHandle)
      .filter(Boolean);

    if (candidates.includes(username) || (globalName && candidates.includes(globalName))) {
      return true;
    }
  }

  return false;
};
