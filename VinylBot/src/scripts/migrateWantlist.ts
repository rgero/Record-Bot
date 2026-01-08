import { WantedItem } from "../interfaces/WantedItem.js";
import { addWantedItems } from "../services/wantlist.api.js";
import { fileURLToPath } from 'node:url';
import { getSheetRowsWithMetadata } from "../utils/google/sheetUtils.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";

export async function migrateWantlist(): Promise<void> {
  try {
    const [rowData, userMap] = await Promise.all([
      getSheetRowsWithMetadata("Searching For!A2:E"),
      resolveUserMap()
    ]);

    const itemsToMigrate: WantedItem[] = rowData.map((row) => {
      const cells = row.values || [];
      const formula = cells[2]?.userEnteredValue?.formulaValue || "";
      const imageUrl = formula.match(/"([^"]+)"/)?.[1] || "";

      const artist: string = cells[0]?.formattedValue?.trim() ?? "Unknown Artist";
      const album: string = cells[1]?.formattedValue?.trim() ?? "Unknown Album";
      
      const searcherName = (cells[3]?.formattedValue ?? "").trim().toLowerCase();
      const searcherIds = userMap.get(searcherName) ?? [];

      return {
        artist,
        album,
        imageUrl, 
        searcher: searcherIds,
        notes: cells[4]?.formattedValue ?? "",
      };
    });

    const validItems = itemsToMigrate.filter(item => item.searcher.length > 0);
    
    if (validItems.length > 0) {
      await addWantedItems(validItems);
      console.log(`✅ Migrated ${validItems.length} wanted items.`);
    } else {
      console.log("⚠️ No valid items found to migrate.");
    }
  } catch (error) {
    console.error("❌ Wantlist migration failed:", error);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateWantlist().catch(console.error);
}