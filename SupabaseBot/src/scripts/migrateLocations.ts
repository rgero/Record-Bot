import { Location } from "../interfaces/Location.js";
import { addLocations } from "../services/locations.api.js";
import { fileURLToPath } from 'node:url';
import { getSheetRows } from "../utils/google/sheetUtils.js";

export async function migrateLocations(): Promise<void> {
  try {
    const rows = await getSheetRows("Location Info!A2:E");

    const storesToMigrate: Location[] = rows.map((row) => {
      const [name, address, recommendedRaw, totalPurchased, notes] = row;
      
      let recommended: boolean | null = null;

      if (recommendedRaw !== null && recommendedRaw !== undefined && recommendedRaw !== "") {
        const recString = String(recommendedRaw).toLowerCase().trim();

        if (recString === "true" || recString === "yes") {
          recommended = true;
        } else if (recString === "false" || recString === "no") {
          recommended = false;
        }
      }

      return {
        name: String(name || "Unknown Store"),
        address: address ? String(address) : null,
        recommended,
        purchaseCount: parseInt(String(totalPurchased)) || 0,
        notes: notes ? String(notes) : null
      };
    });

    if (storesToMigrate.length > 0) {
      await addLocations(storesToMigrate);
      console.log(`Migrated ${storesToMigrate.length} locations.`);
    }
  } catch (error) {
    console.error("Location migration failed:", error);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateLocations().catch(console.error);
}