import { getData } from "./GetData.js";
import { normalizeString } from "../utils/normalizeString.js";

export const checkIfAlbumExists = async (sheetName, artist, album) => {

  const rows = await getData(sheetName);
  const normalizedArtist = normalizeString(artist);
  const normalizedAlbum = normalizeString(album);

  const alreadyExists = rows.some((row) => {
    const rowArtist = normalizeString(row[0]);
    const rowAlbum = normalizeString(row[1]);
    return rowArtist === normalizedArtist && rowAlbum === normalizedAlbum;
  });
  return alreadyExists;
}