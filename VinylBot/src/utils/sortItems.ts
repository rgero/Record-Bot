import { Vinyl } from "../interfaces/Vinyl.js";
import { WantedItem } from "../interfaces/WantedItem.js";
import { normalizeString } from "./normalizeString.js";

export const validSorts = ["artist+", "artist-", "album+", "album-", "length+", "length-", "plays+", "plays-"];

type SortItem = Vinyl | WantedItem;

/**
 * Helpers 
*/
export const sortItems = (vinyls: SortItem[], sortBy: string): SortItem[] => {
  const sortedData = [...vinyls];
  const direction = sortBy.endsWith('-') ? '-' : '+';
  const field = sortBy.slice(0, -1); // Removes the last character (+ or -)

  sortedData.sort((a: SortItem, b: SortItem) => {
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
        compareA = 'length' in a ? (a.length ?? 0) : 0;
        compareB = 'length' in b ? (b.length ?? 0) : 0;
        break;
      case 'plays':
        compareA = 'playCount' in a ? (a.playCount ?? 0) : 0;
        compareB = 'playCount' in b ? (b.playCount ?? 0) : 0  ;
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
