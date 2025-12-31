import { SpotifyAlbum } from "../interfaces/spotify/SpotifyAlbum";
import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl";
import { spotifyGet } from "../services/spotify.api";

export const getSpotifyData = async (parsed: SpotifyUrl) => 
{
  const data: SpotifyAlbum = await spotifyGet(`${parsed.type}s/${parsed.id}`);

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