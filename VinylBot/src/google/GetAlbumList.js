import { getData } from "./GetData.js";
import { normalizeString } from "../utils/normalizeString.js";

export const getAlbumList = async (listType, { type, term }) => {

  const isWantList = listType === "want";
  const sheetName = isWantList ? process.env.WANT_LIST_SHEET_NAME : process.env.ALBUM_SHEET_NAME;
  
  // Want List user is col 5 (idx 4), Have List user is col 7 (idx 6)
  const userColumnIndex = isWantList ? 4 : 6;

  let dataRows = await getData(sheetName);

  if (type === "user") {
    dataRows = dataRows.filter(
      (row) => row[userColumnIndex] && 
               row[userColumnIndex].toLowerCase().includes(term.toLowerCase())
    );
  } else if (type === "search") {
    const searchTerm = term.toLowerCase();
    dataRows = dataRows.filter(
      (row) => 
        (row[1] && row[1].toLowerCase().includes(searchTerm)) ||
        (row[2] && row[2].toLowerCase().includes(searchTerm))
    );
  }

  dataRows.sort((a, b) => {
    const artistCompare = normalizeString(a[1]).localeCompare(
      normalizeString(b[1]), 
      undefined, 
      { sensitivity: "base" }
    );

    if (artistCompare !== 0) return artistCompare;

    return normalizeString(a[2]).localeCompare(
      normalizeString(b[2]), 
      undefined, 
      { sensitivity: "base" }
    );
  });

  return dataRows;
};