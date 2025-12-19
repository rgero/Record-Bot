import { spotifyGet } from "./spotify.js";

export const getSpotifyData = async (parsed) => 
{
  const data = await spotifyGet(`${parsed.type}s/${parsed.id}`);

  const artists = data.artists?.map(a => a.name).join(", ") || "";
  const albumName = data.name || "";
  const albumArt = data.images?.[0]?.url || "";
  const releaseDate = data.release_date;
  const totalTracks = data.total_tracks;
      
  return {
    artists,
    albumName,
    albumArt,
    releaseDate,
    totalTracks
  }
}