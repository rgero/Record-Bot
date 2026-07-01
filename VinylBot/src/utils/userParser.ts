import fs from "fs";
import path from "path";

type MappingEntry =
  | string
  | {
      displayName?: string;
      discordId?: string;
      usernames?: string[];
    };

export const isInList = (user:string): boolean => {
  try {
    const data = fs.readFileSync(path.resolve("./discordMapping.json"), "utf8");
    const mapping = JSON.parse(data) as Record<string, MappingEntry>;

    const values = Object.values(mapping).map((entry) =>
      typeof entry === "string" ? entry : entry.displayName
    );
    return values.includes(user);

  } catch (err) {
    console.error("Failed to load discordMapping.json", err);
    return false;
  }

};
