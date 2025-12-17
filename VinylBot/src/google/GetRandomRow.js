import fs from "fs";
import { google } from "googleapis";

const credentials = JSON.parse(fs.readFileSync("./service-account.json"));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export async function getRandomRow({sheetName, filterColumnIndex = null, filterValue = null}) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) return null;

  // Remove header row
  let dataRows = rows.slice(1);

  // Optional filtering
  if (filterColumnIndex !== null && filterValue) {
    dataRows = dataRows.filter(
      (row) =>
        row[filterColumnIndex] &&
        row[filterColumnIndex].toLowerCase().includes(filterValue.toLowerCase())
    );
  }

  if (dataRows.length === 0) return null;

  // Pick random row
  const randomIndex = Math.floor(Math.random() * dataRows.length);
  return dataRows[randomIndex];
}