import { Vinyl } from "../interfaces/Vinyl.js";
import { addVinyls } from "../services/vinyls.api.js";
import { getSheetRows } from "../utils/google/sheetUtils.js";
import { resolveLocationMap } from "../utils/resolveLocationMap.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";

export const migrateVinyls = async (): Promise<void> => {
  try {
    const [rows, userMap, locationMap] = await Promise.all([
      getSheetRows("Vinyls!A2:K"),
      resolveUserMap(),
      resolveLocationMap()
    ]);

    if (rows.length === 0) return;

    const itemsToMigrate: Vinyl[] = rows.map((row) => {
      const [purchaseNum, artist, album, date, loc, price, owners, len, notes, plays, likes, color] = row;

      // Standardize lookup for owners and likes
      const ownerIds = userMap.get(String(owners || "").toLowerCase()) ?? [];
      const likedByArray = String(likes || "").split(",").map(name => name.trim().toLowerCase()).flatMap(name => userMap.get(name) ?? []);
      
      return {
        purchaseNumber: parseInt(purchaseNum) || 0,
        artist: artist?.trim() ?? "Unknown Artist",
        album: album?.trim() ?? "Unknown Album",
        purchaseDate: date ? new Date(date) : new Date(),
        purchaseLocation: locationMap.get(loc) ?? "",
        price: parseFloat(price) || 0,
        owners: ownerIds,
        length: parseInt(len) || 0,
        notes: notes ?? "",
        playCount: parseInt(plays) || 0,
        likedBy: Array.from(new Set(likedByArray)),
        color: color?.trim() || ""
      };
    });

    await addVinyls(itemsToMigrate);
    console.log(`Successfully migrated ${itemsToMigrate.length} vinyls.`);
  } catch (error) {
    console.error("Vinyl migration failed:", error);
  }
};