import { getData } from "./GetData.js";
import { normalizeString } from "../utils/normalizeString.js";

export const getWantList = async ({type, term}) => {
  
  let dataRows = await getData(process.env.WANT_LIST_SHEET_NAME);

  if (type === "user")
  {
    // Filter the dataRows by column 4 (index 3)
    dataRows = dataRows.filter(
      (row) => row[3] && row[3].toLowerCase().includes(term.toLowerCase())
    );
  } else if (type === "artist") {
    // Filter the dataRows by column 1 (index 0)
    dataRows = dataRows.filter(
      (row) => row[0] && row[0].toLowerCase().includes(term.toLowerCase())
    );
  }

  // Sort the rows - Artist and then Album. Ignoring the/a/an
  dataRows.sort((a, b) => {
    const artistA = normalizeString(a[0]);
    const artistB = normalizeString(b[0]);

    const artistCompare = artistA.localeCompare(artistB, undefined, {
      sensitivity: "base",
    });

    if (artistCompare !== 0) return artistCompare;

    const albumA = normalizeString(a[1]);
    const albumB = normalizeString(b[1]);

    return albumA.localeCompare(albumB, undefined, {
      sensitivity: "base",
    });
  });

  return dataRows
}
