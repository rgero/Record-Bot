import fs from "fs";
import { google } from "googleapis";

const credentials = JSON.parse(fs.readFileSync("./service-account.json"));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

/**
 * Append album data to the sheet with requester
 * Prevents duplicates (Artist + Album)
 *
 * @returns {boolean} true if appended, false if already exists
 */
export async function appendAlbumToSheet(
  artist,
  album,
  imageUrl,
  requester,
  sheetName = "Searching For"
) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("SPREADSHEET_ID is not set in .env");

  // Validate sheet exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetExists = meta.data.sheets.some(
    (s) => s.properties.title === sheetName
  );

  if (!sheetExists) {
    throw new Error(`Sheet/tab "${sheetName}" not found.`);
  }

  // -----------------------
  // Duplicate check
  // -----------------------
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:B`,
  });

  const rows = existing.data.values || [];

  const normalizedArtist = artist.trim().toLowerCase();
  const normalizedAlbum = album.trim().toLowerCase();

  const alreadyExists = rows.slice(1).some((row) => {
    const rowArtist = row[0]?.trim().toLowerCase();
    const rowAlbum = row[1]?.trim().toLowerCase();
    return rowArtist === normalizedArtist && rowAlbum === normalizedAlbum;
  });

  if (alreadyExists) {
    console.log(`⛔ Skipped duplicate: "${album}" by "${artist}"`);
    return false;
  }

  const imageFormula = imageUrl ? `=IMAGE("${imageUrl}")` : "";

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:D`,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[artist, album, imageFormula, requester]],
    },
  });

  console.log(`✅ Appended album "${album}" by "${artist}"`);
  return true;
}

export async function getRandomRow({
  sheetName,
  filterColumnIndex = null,
  filterValue = null,
}) {
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