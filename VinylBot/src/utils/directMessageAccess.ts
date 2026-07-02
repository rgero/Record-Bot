import fs from "fs";
import path from "path";

type MappingValue = {
  displayName?: string;
  discordId?: string;
};

type DiscordMapping = Record<string, MappingValue>;

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

  return Object.values(mapping).some((mappedValue) => mappedValue.discordId === author.id);
};
