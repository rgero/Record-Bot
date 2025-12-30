import { PlayLog } from "../interfaces/PlayLog";
import { addPlayLogs } from "../services/plays.api";
import { getSheetRowsWithMetadata } from "../utils/google/sheetUtils";
import { resolveUserMap } from "../utils/resolveUserMap";

/**
 * Returns true if the row contains at least one meaningful value
 */
function isNonEmptyPlayLogRow(row: any): boolean {
  const cells = row.values ?? [];

  const artist = cells[0]?.formattedValue?.trim();
  const album = cells[1]?.formattedValue?.trim();
  const date = cells[2]?.formattedValue?.trim();

  return Boolean(artist || album || date);
}

function mapRowToPlayLog(row: any, listeners: string[]): PlayLog {
  const cells = row.values ?? [];

  const artist = cells[0]?.formattedValue?.trim() ?? "Unknown Artist";
  const album = cells[1]?.formattedValue?.trim() ?? "Unknown Album";

  const dateString = cells[2]?.formattedValue?.trim();
  const date = dateString ? new Date(dateString) : null;

  return { artist, album, date, listeners };
}

async function migratePlayLogs(): Promise<void> {
  try {
    const userMap = await resolveUserMap();
    const names = Array.from(userMap.keys());

    let plays: PlayLog[] = [];

    for (const name of names) {
      const sheetName = `${name}'s Play Log!A2:C`;

      let rowData;
      try {
        rowData = await getSheetRowsWithMetadata(sheetName);
      } catch {
        console.warn(`Skipping missing sheet: ${sheetName}`);
        continue;
      }

      const listeners = userMap.get(name) ?? [];
      const userPlays: PlayLog[] = rowData.filter(isNonEmptyPlayLogRow).map((row) => mapRowToPlayLog(row, listeners));
      plays.push(...userPlays);
    }

    await addPlayLogs(plays);

    console.log(`Migrated ${plays.length} play logs`);
  } catch (error) {
    console.error("Play Logs migration failed:", error);
  }
}

migratePlayLogs().catch(console.error);
