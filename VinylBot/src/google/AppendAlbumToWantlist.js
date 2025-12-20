import { checkIfAlbumExists } from "./CheckAlbumExists.js";
import { getGoogleSheetsClient } from "./GetGoogleSheetsClient.js";

export const appendAlbumToSheet = async (artist, album, imageUrl, requester, notes = "", sheetName = process.env.WANT_LIST_SHEET_NAME) => {
  const sheets = await getGoogleSheetsClient();

  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("SPREADSHEET_ID is not set in .env");

  try {
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
  } catch (err)
  {
    console.log(err);
    return false;
  }

}