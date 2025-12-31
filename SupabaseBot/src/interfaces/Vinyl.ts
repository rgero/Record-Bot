
export interface Vinyl {
  id?: number;
  purchaseNumber: number;
  artist: string;
  album: string;
  purchaseDate: Date;
  purchaseLocation: string;
  price: number;
  owner: string[];
  length: number;
  notes?: string;
  playCount: number;
  likedBy: string[];
}