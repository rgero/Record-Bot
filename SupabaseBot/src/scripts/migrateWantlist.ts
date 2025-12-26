import { WantedItem } from "../interfaces/WantedItem";
import { addWantedItems } from "../services/wantlist.api";
import dotenv from "dotenv";
import { google } from "googleapis";
import path from "node:path";
import { resolveUserMap } from "../utils/resolveUserMap";

dotenv.config();

if (!process.env.SPREADSHEET_ID) {
  throw new Error("SPREADSHEET_ID env var is required");
}

const SERVICE_ACCOUNT_PATH = path.resolve(
  process.cwd(),
  "service-account.json"
);

const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_PATH,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({version: "v4", auth});

const migrateWantlist = async (): Promise<void> => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "Searching For!A2:E"
    });

    const rows = response.data.values;
    if (!rows?.length) {
      console.log("No wanted items found in sheet.");
      return;
    }

    const userMap = await resolveUserMap();

    // Map rows to items with explicit destructuring
    const itemsToMigrate: WantedItem[] = rows.map((row) => {
      const [artist, album, imageUrl, searcherName, notes] = row;
      
      return {
        artist: artist?.trim() ?? "Unknown Artist",
        album: album?.trim() ?? "Unknown Album",
        imageUrl: imageUrl ?? "",
        searcher: userMap.get(searcherName) ?? [],
        notes: notes ?? "",
      };
    });

    const validItems = itemsToMigrate.filter(item => item.searcher.length > 0);
    
    if (validItems.length === 0) {
      console.warn("No valid items with assigned searchers found.");
      return;
    }

    console.log(`Migrating ${validItems.length} items...`);
    await addWantedItems(validItems);
    console.log("Migration complete.");

  } catch (error) {
    console.error("Migration failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

migrateWantlist().catch(console.error);