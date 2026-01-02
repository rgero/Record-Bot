import { Vinyl } from "../interfaces/Vinyl";
import { addVinyls } from "../services/vinyls.api";
import { getSheetRows } from "../utils/google/sheetUtils";
import { resolveLocationMap } from "../utils/resolveLocationMap";
import { resolveUserMap } from "../utils/resolveUserMap";

const migrateVinyls = async (): Promise<void> => {
  try {
    const [rows, userMap, locationMap] = await Promise.all([
      getSheetRows("Vinyls!A2:K"),
      resolveUserMap(),
      resolveLocationMap()
    ]);

    if (rows.length === 0) return;

    const itemsToMigrate: Vinyl[] = rows.map((row) => {
      const [purchaseNum, artist, album, date, loc, price, owners, len, notes, plays, likes] = row;

      let likedByArray: string[] = [];
      const likesSplit = String(likes).split(",");
      likesSplit.forEach( (value: string) => {
        const userId = userMap.get(value.trim());
        if (userId) {
          likedByArray.push(userId[0]);
        }
      })
      
      return {
        purchaseNumber: parseInt(purchaseNum) || 0,
        artist: artist?.trim() ?? "Unknown Artist",
        album: album?.trim() ?? "Unknown Album",
        purchaseDate: date ? new Date(date) : new Date(),
        purchaseLocation: locationMap.get(loc) ?? "",
        price: parseFloat(price) || 0,
        owners: userMap.get(owners) ?? [],
        length: parseInt(len) || 0,
        notes: notes ?? "",
        playCount: parseInt(plays) || 0,
        likedBy: likedByArray ?? [],
      };
    });

    await addVinyls(itemsToMigrate);
    console.log(`Successfully prepared ${itemsToMigrate.length} vinyls.`);
  } catch (error) {
    console.error("Vinyl migration failed:", error);
  }
};

migrateVinyls().catch(console.error);