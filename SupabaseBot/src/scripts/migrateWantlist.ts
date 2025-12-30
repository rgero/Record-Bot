import { WantedItem } from "../interfaces/WantedItem";
import { addWantedItems } from "../services/wantlist.api";
import { getSheetRowsWithMetadata } from "../utils/google/sheetUtils";
import { resolveUserMap } from "../utils/resolveUserMap";

async function migrateWantlist(): Promise<void> {
  try {
    // Fetch data and user map in parallel
    const [rowData, userMap] = await Promise.all([
      getSheetRowsWithMetadata("Searching For!A2:E"),
      resolveUserMap()
    ]);

    const itemsToMigrate: WantedItem[] = rowData.map((row) => {
      const cells = row.values || [];
      
      // Extract URL from =IMAGE("https://...")
      const formula = cells[2]?.userEnteredValue?.formulaValue || "";
      const imageUrl = formula.match(/"([^"]+)"/)?.[1] || "";

      // If the imageUrl extraction fails, go to Spotify
      const artist: string = cells[0]?.formattedValue?.trim() ?? "";
      const album: string = cells[1]?.formattedValue?.trim() ?? "";
      
      // TODO: Fix this... probably?

      return {
        artist: cells[0]?.formattedValue?.trim() ?? "Unknown Artist",
        album: cells[1]?.formattedValue?.trim() ?? "Unknown Album",
        imageUrl, 
        searcher: userMap.get(cells[3]?.formattedValue ?? "") ?? [],
        notes: cells[4]?.formattedValue ?? "",
      };
    });

    const validItems = itemsToMigrate.filter(item => item.searcher.length > 0);
    
    if (validItems.length > 0) {
      await addWantedItems(validItems);
      console.log(`Migrated ${validItems.length} wanted items.`);
    }
  } catch (error) {
    console.error("Wantlist migration failed:", error);
  }
}

migrateWantlist().catch(console.error);