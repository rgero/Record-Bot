import { getGoogleSheetsClient } from "./GetGoogleSheetsClient.js";

export const LogPlay = async (artist, album, user) => {
  // By this point, we've already verified the album and the user.
  // I just need to append it to the end.
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) throw new Error("SPREADSHEET_ID is not set in .env");
    
    // construct sheet name
    const sheetName = `${user}'s Play Log`
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = meta.data.sheets.some(
      (s) => s.properties.title === sheetName
    );

    if (!sheetExists) {
      throw new Error(`Sheet/tab "${sheetName}" not found.`);
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetName}'!A:C`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[artist, album, new Date().toDateString()]],
      },
    });

    console.log(`✅ Added play for ${user} - album "${album}" by "${artist}"`);
    return true;
  } catch (err) {
    console.error(err)
    return false;
  }
}