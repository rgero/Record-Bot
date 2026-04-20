import { SpotifyAlbum } from "../interfaces/spotify/SpotifyAlbum.js";
import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl.js";
import { spotifyGet } from "../services/spotify.api.js";

export const getSpotifyData = async (parsed: SpotifyUrl) => 
{
  const data: SpotifyAlbum = await spotifyGet(`${parsed.type}s/${parsed.id}`);
  
  const artists = data.artists?.map(a => a.name).join(", ") || "";
  const albumName = data.name || "";
  const albumArt = data.images?.[0]?.url || "";
  const releaseDate = data.release_date;
  const totalTracks = data.total_tracks;

  let totalMinutes = 0;

  if (data.tracks?.items) {
    const totalDurationMs = data.tracks.items.reduce((acc, track) => {
      return acc + track.duration_ms;
    }, 0);
    totalMinutes = Math.ceil(totalDurationMs / 60000);
  }

  return {
    artists,
    albumName,
    albumArt,
    releaseDate,
    totalTracks,
    length: totalMinutes
  }
}