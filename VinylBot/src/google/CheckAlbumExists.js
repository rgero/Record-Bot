import fs from "fs";
import { google } from "googleapis";

const credentials = JSON.parse(fs.readFileSync("./service-account.json"));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export const checkIfAlbumExists = async (sheetName, artist, album) => {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  const spreadsheetId = process.env.SPREADSHEET_ID;

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
  return alreadyExists;
}