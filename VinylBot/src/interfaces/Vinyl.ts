import { BaseVinyl } from "./BaseVinyl";
import { Location } from "./Location";

export interface Vinyl extends BaseVinyl{
  // Properties inherited from BaseVinyl: id, artist, album
  purchaseNumber?: number;
  color?: string;
  purchaseDate: string;
  purchasedBy?: string[];
  purchaseLocation?: Location;
  price?: number;
  owners: string[];
  length?: number;
  notes?: string;
  playCount?: number;
  likedBy?: string[];
  imageUrl: string;
  doubleLP: boolean;
  tags?: string[];
}

export type VinylWithLocation = {
  owners: string[];
  purchaseLocation: { name: string };
};