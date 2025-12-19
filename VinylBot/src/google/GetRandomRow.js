import { getData } from "./GetData.js";

export const getRandomRow = async ({filterColumnIndex = null, filterValue = null}) => {
  let dataRows = await getData();

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