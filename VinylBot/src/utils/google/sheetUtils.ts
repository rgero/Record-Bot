import { SPREADSHEET_ID, sheets } from "./googleSheetsClient.js";

export async function getSheetRows(range: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return response.data.values || [];
}

export async function getSheetRowsWithMetadata(range: string) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [range],
    includeGridData: true,
  });
  return response.data.sheets?.[0].data?.[0].rowData || [];
}