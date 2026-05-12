import { BaseVinyl } from "./BaseVinyl";

export interface WantedItem extends BaseVinyl {
  // Properties inherited from BaseVinyl: id, artist, album
  imageUrl?: string,
  searcher: string[],
  notes?: string
}