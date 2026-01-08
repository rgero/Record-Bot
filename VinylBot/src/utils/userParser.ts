import fs from "fs";
import path from "path";

export const isInList = (user:string): boolean => {
  try {
    let mapping = {};
    const data = fs.readFileSync(path.resolve("./discordMapping.json"), "utf8");
    mapping = JSON.parse(data);

    const values = Object.values(mapping);
    return values.includes(user);

  } catch (err) {
    console.error("Failed to load discordMapping.json", err);
    return false;
  }

};
