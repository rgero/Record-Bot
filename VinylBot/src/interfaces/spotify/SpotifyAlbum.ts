export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  total_tracks: number;
  length: number;
  images: { url: string; height: number; width: number }[];
  artists: { name: string }[];
  tracks: {
    items: SpotifyTrack[];
    next: string | null;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  track_number: number;
  // You can add more fields here if needed (e.g., preview_url)
}