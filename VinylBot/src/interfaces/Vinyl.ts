
export interface Vinyl {
  id?: number;
  purchaseNumber: number;
  artist: string;
  album: string;
  color?: string;
  purchaseDate: Date;
  purchaseLocation: string;
  price?: number;
  owners: string[];
  length: number;
  notes?: string;
  playCount: number;
  likedBy: string[];
}