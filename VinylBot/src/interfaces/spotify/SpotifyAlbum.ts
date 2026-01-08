export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  total_tracks: number;
  images: { url: string; height: number; width: number }[];
  artists: { name: string }[];
}