import { Vinyl } from "../interfaces/Vinyl.js";
import { normalizeString } from "./normalizeString.js";

export const validSorts = ["artist+", "artist-", "album+", "album-", "length+", "length-", "plays+", "plays-"];


/**
 * Helpers 
*/
export const sortVinyls = (vinyls: Vinyl[], sortBy: string): Vinyl[] => {
  const sortedData = [...vinyls];
  const direction = sortBy.endsWith('-') ? '-' : '+';
  const field = sortBy.slice(0, -1); // Removes the last character (+ or -)

  sortedData.sort((a: Vinyl, b: Vinyl) => {
    let compareA: any = '';
    let compareB: any = '';

    switch (field) {
      case 'artist':
        compareA = normalizeString(a.artist);
        compareB = normalizeString(b.artist);
        break;
      case 'album':
        compareA = normalizeString(a.album);
        compareB = normalizeString(b.album);
        break;
      case 'length':
        compareA = a.length ?? 0;
        compareB = b.length ?? 0;
        break;
      case 'plays':
        compareA = a.playCount ?? 0;
        compareB = b.playCount ?? 0;
        break;
      default:
        return 0;
    }

    // Handle descending order logic
    const result = typeof compareA === 'string' 
      ? compareA.localeCompare(compareB) 
      : compareA - compareB;

    return direction === '-' ? result * -1 : result;
  });

  return sortedData;
}
