import { PlayLog } from "../interfaces/PlayLog.js";
import { addPlayLogs } from "../services/plays.api.js";
import { getSheetRowsWithMetadata } from "../utils/google/sheetUtils.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";

export async function migratePlayLogs(): Promise<void> {
  try {
    const userMap = await resolveUserMap();
    const names = Array.from(userMap.keys()).filter(n => n !== "both");

    let totalPlays: PlayLog[] = [];

    for (const name of names) {
      // Note: This expects the sheet name to be capitalized like "John's Play Log"
      // You may need to capitalize the first letter of 'name' if names are stored lowercase.
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      const sheetRange = `${capitalized}'s Play Log!A2:C`;

      try {
        const rowData = await getSheetRowsWithMetadata(sheetRange);
        const listeners = userMap.get(name) ?? [];

        const userPlays: PlayLog[] = rowData
          .filter(row => {
            const c = row.values ?? [];
            return Boolean(c[0]?.formattedValue || c[1]?.formattedValue);
          })
          .map(row => {
            const c = row.values ?? [];
            return {
              artist: c[0]?.formattedValue?.trim() ?? "Unknown Artist",
              album: c[1]?.formattedValue?.trim() ?? "Unknown Album",
              date: c[2]?.formattedValue ? new Date(c[2].formattedValue) : null,
              listeners: listeners
            };
          });
        
        totalPlays.push(...userPlays);
      } catch {
        console.warn(`Skipping missing sheet: ${sheetRange}`);
      }
    }

    await addPlayLogs(totalPlays);
    console.log(`Migrated ${totalPlays.length} play logs.`);
  } catch (error) {
    console.error("Play Logs migration failed:", error);
  }
}