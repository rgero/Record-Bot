import { checkIfAlbumExists } from "./CheckAlbumExists.js";
import fs from "fs";
import { google } from "googleapis";

const credentials = JSON.parse(fs.readFileSync("./service-account.json"));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export async function appendAlbumToSheet(artist, album, imageUrl, requester, notes = "", sheetName = "Searching For") {
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

  const alreadyExists = await checkIfAlbumExists(sheetName, artist, album)
  if (alreadyExists) {
    console.log(`⛔ Skipped duplicate: "${album}" by "${artist}"`);
    return false;
  }

  const imageFormula = imageUrl ? `=IMAGE("${imageUrl}")` : "";

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:E`,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[artist, album, imageFormula, requester, notes]],
    },
  });

  console.log(`✅ Appended album "${album}" by "${artist}"`);
  return true;
}




