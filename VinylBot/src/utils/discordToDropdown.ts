import fs from "fs";
import path from "path";

let mappingCache: Record<string, string> | null = null;

export const getDropdownValue = (user: string) => {
  if (mappingCache === null) {
    try {
      const data = fs.readFileSync(path.resolve("./discordMapping.json"), "utf8");
      mappingCache = JSON.parse(data) as Record<string, string>;
    } catch (err) {
      console.error("Failed to load discordMapping.json", err);
      mappingCache = {};
    }
  }
  return mappingCache[user] || "Unknown";
};
