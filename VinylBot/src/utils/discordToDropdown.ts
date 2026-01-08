import fs from "fs";
import path from "path";

export const getDropdownValue = (user: string) => {
  try {
    let mapping: { [key: string]: string } = {};
    const data = fs.readFileSync(path.resolve("./discordMapping.json"), "utf8");
    mapping = JSON.parse(data);
    return mapping[user] || "Unknown";

  } catch (err) {
    console.error("Failed to load discordMapping.json", err);
    return "Unknown";
  }
};
