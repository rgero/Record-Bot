import { Location } from "../interfaces/Location";
import { addLocations } from "../services/locations.api";
import dotenv from "dotenv";
import { google } from "googleapis";
import path from "node:path";

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

async function migrateLocations(): Promise<void> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID!,
    range: "Location Info!A2:E",
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    console.log("No stores found in sheet.");
    return;
  }

  let storesToMigrate: Location[] = [];
  for (const row of rows) {
    const [name, address, recommendedRaw, totalPurchased, notes] = row;

    if (!name) {
      console.warn("Skipping invalid row:", row);
      continue;
    }

    const recommended = String(recommendedRaw).toLowerCase() === "true" || String(recommendedRaw).toLowerCase() === "yes";

    const newLocation = {
      name: String(name),
      address: address ? String(address) : null,
      recommended,
      purchaseCount: totalPurchased ? parseInt(String(totalPurchased)) : 0,
      notes: notes ? String(notes) : null
    };

    storesToMigrate.push(newLocation);
  }

  await addLocations(storesToMigrate);

}

migrateLocations().catch(console.error);