import { Location } from "./Location";

export interface Vinyl {
  id?: number;
  purchaseNumber?: number;
  artist: string;
  album: string;
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