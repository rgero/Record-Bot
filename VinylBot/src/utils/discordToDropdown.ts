import fs from "fs";
import path from "path";

type MappingEntry = {
  displayName?: string;
  discordId?: string;
  usernames?: string[];
};

let mappingCache: Record<string, MappingEntry> | null = null;

const normalizeHandle = (value: string | null | undefined): string =>
  (value ?? "").trim().replace(/^@/, "").replace(/^\./, "").toLowerCase();

const getDisplayName = (entry: MappingEntry): string => entry.displayName || "Unknown";

export const getDropdownValue = (user: string, discordId?: string, globalName?: string | null) => {
  if (mappingCache === null) {
    try {
      const data = fs.readFileSync(path.resolve("./discordMapping.json"), "utf8");
      mappingCache = JSON.parse(data) as Record<string, MappingEntry>;
    } catch (err) {
      console.error("Failed to load discordMapping.json", err);
      mappingCache = {};
    }
  }

  if (discordId) {
    for (const entry of Object.values(mappingCache)) {
      if (entry.discordId === discordId) {
        return getDisplayName(entry);
      }
    }
  }

  const requestedNames = [normalizeHandle(user), normalizeHandle(globalName)].filter(Boolean);

  for (const [mappedUsername, entry] of Object.entries(mappingCache)) {
    const aliases = [mappedUsername, ...(entry.usernames ?? [])];
    const normalizedAliases = aliases.map(normalizeHandle).filter(Boolean);

    if (requestedNames.some((name) => normalizedAliases.includes(name))) {
      return getDisplayName(entry);
    }
  }

  return "Unknown";
};
