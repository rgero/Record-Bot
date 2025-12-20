import { getData } from "./GetData.js";

export const getRandomRow = async ({sheetName = null, filterColumnIndex = null, filterValue = null}) => {
  let dataRows = await getData(sheetName);

  if (filterColumnIndex !== null && filterValue) {
    dataRows = dataRows.filter(
      (row) =>
        row[filterColumnIndex] &&
        row[filterColumnIndex].toLowerCase().includes(filterValue.toLowerCase())
    );
  }

  if (sheetName === null || sheetName === process.env.ALBUM_SHEET_NAME)
  {
    dataRows = dataRows.filter(
      (row) => row[2] != ""
    )
  } else if (sheetName === process.env.LOCATIONS_SHEET_NAME)
  {
    dataRows = dataRows.filter(
      (row) => row[1] != ""
    )
  }

  if (dataRows.length === 0) return null;

  // Pick random row
  const randomIndex = Math.floor(Math.random() * dataRows.length);
  return dataRows[randomIndex];
}