import { fileURLToPath } from 'node:url';
import { getAlbumArtFromSpotify } from "../services/spotify.api.js";
import supabase from "../services/supabase.js";

export async function populateAlbumArt(): Promise<void>
{
  const { data: albums, error } = await supabase.from("vinyls").select("id, artist, album, imageUrl");

  if (error) {
    throw new Error(`Supabase fetch error: ${error.message}`);
  }

  let albumsToFix = albums?.filter(album => !album.imageUrl || album.imageUrl.trim() === "");
  if (!albumsToFix || albumsToFix.length === 0) {
    console.log("No albums need album art");
    return;
  }

  for (const album of albumsToFix) {
    try {
      const albumArtUrl = await getAlbumArtFromSpotify(album.artist, album.album);
      if (albumArtUrl) {
        await supabase.from("vinyls").update({ imageUrl: albumArtUrl }).eq("id", album.id);
      }
    } catch (error) {
      console.error(`Error fetching album art for ${album.artist} - ${album.album}:`, error);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  populateAlbumArt().catch(console.error);
}