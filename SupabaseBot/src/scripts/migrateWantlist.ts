import { WantedItem } from "../interfaces/WantedItem";
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

async function migrateWantlist(): Promise<void> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID!,
    range: "Searching For!A2:E",
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    console.log("No wanted items found in sheet.");
    return;
  }

  let itemsToMigrate: WantedItem[] = [];
  rows.forEach( (row) => {
    console.log(row);
  })
}

migrateWantlist().catch(console.error);