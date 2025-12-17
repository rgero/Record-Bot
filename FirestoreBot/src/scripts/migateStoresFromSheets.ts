import { db } from "../firebase";
import dotenv from "dotenv";
import { google } from "googleapis";
import path from "node:path";

dotenv.config();


// ---------------------------------------------
// Environment safety check
// ---------------------------------------------
if (!process.env.SPREADSHEET_ID) {
  throw new Error("SPREADSHEET_ID env var is required");
}

const SERVICE_ACCOUNT_PATH = path.resolve(
  process.cwd(),
  "service-account.json"
);

// ---------------------------------------------
// Google Sheets Auth
// ---------------------------------------------
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_PATH,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

// ---------------------------------------------
// Sheets client (IMPORTANT: auth goes here)
// ---------------------------------------------
const sheets = google.sheets({
  version: "v4",
  auth,
});

// ---------------------------------------------
// Migration
// ---------------------------------------------
async function migrateStores(): Promise<void> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID!,
    range: "Location Info!A2:D", // adjust if needed
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    console.log("No stores found in sheet.");
    return;
  }

  let migrated = 0;

  for (const row of rows) {
    const [name, address, recommendedRaw, totalPurchased, notes] = row;

    if (!name) {
      console.warn("Skipping invalid row:", row);
      continue;
    }

    const recommended = String(recommendedRaw).toLowerCase() === "true" || String(recommendedRaw).toLowerCase() === "yes";

    const storeId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    await db.collection("stores").doc(storeId).set(
      {
        name,
        address: address || "",
        recommended: recommended || false,
        purchaseCount: 0,
        notes: notes || "",
      },
      { merge: true }
    );

    migrated++;
  }

  console.log(`✅ Migrated ${migrated} stores`);
}

// ---------------------------------------------
// Execute
// ---------------------------------------------
migrateStores().catch(err => {
  console.error("❌ Store migration failed:", err);
  process.exit(1);
});
