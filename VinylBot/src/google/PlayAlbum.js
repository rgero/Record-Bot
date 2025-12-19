import { getData } from "./GetData";
import { getGoogleSheetsClient } from "./GetGoogleSheetsClient";

export async function LogPlay() {
  const sheets = getGoogleSheetsClient();
  let rows = await getData();
  if (!rows || rows.length <= 1) return null;
}