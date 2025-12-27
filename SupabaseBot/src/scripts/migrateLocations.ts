import { Location } from "../interfaces/Location";
import { addLocations } from "../services/locations.api";
import { getSheetRows } from "../utils/google/sheetUtils";

async function migrateLocations(): Promise<void> {
  try {
    const rows = await getSheetRows("Location Info!A2:E");

    const storesToMigrate: Location[] = rows.map((row) => {
      const [name, address, recommendedRaw, totalPurchased, notes] = row;
      
      const recString = String(recommendedRaw).toLowerCase();
      const recommended = recString === "true" || recString === "yes";

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

migrateLocations().catch(console.error);