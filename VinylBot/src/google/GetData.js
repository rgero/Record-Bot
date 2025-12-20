import { getGoogleSheetsClient } from "./GetGoogleSheetsClient.js";

export const getData = async (sheetName = process.env.ALBUM_SHEET_NAME) => {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) return [];

  // Remove header row
  return rows.slice(1);
}