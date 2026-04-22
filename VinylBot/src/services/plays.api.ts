import { AlbumCount } from "#interfaces/AlbumCount.js";
import { ArtistCount } from "#interfaces/ArtistCount.js";
import { PlayLog } from "#interfaces/PlayLog.js";
import supabase from "./supabase.js";

const aggregateAlbumCounts = (playLogs: any[]): AlbumCount[] => {
  const albumCountMap: Record<number, AlbumCount> = {};

  playLogs.forEach((p) => {
    const albumId = p.album_id;
    const artist = p.vinyls?.artist || "Unknown Artist";
    const album = p.vinyls?.album || "Unknown Album";

    if (albumCountMap[albumId]) {
      albumCountMap[albumId].count += 1;
    } else {
      albumCountMap[albumId] = {
        title: `${artist} - ${album}`,
        count: 1,
      };
    }
  });

  return Object.values(albumCountMap).sort((a, b) => b.count - a.count);
};


export const getPlayLogs = async (): Promise<PlayLog[]> => {
  const { data, error } = await supabase
    .from("playlogs")
    .select("*, vinyls(artist, album)");

  if (error) {
    console.error("Error fetching playlogs:", error);
    return [];
  }

  return (data ?? []).map((p) => ({
    ...p,
    artist: p.vinyls?.artist,
    album: p.vinyls?.album,
  }));
};

const getPlaylogsByUserID = async (userID: string): Promise<PlayLog[]> => {
  const { data, error } = await supabase
    .from("playlogs")
    .select("*, vinyls(artist, album)")
    .contains("listeners", [userID]);

  if (error) {
    console.error("Error fetching playlogs:", error);
    return [];
  }

  return (data ?? []).map((p) => ({
    ...p,
    artist: p.vinyls?.artist,
    album: p.vinyls?.album,
  }));
};

export const addPlayLog = async (newPlayLog: PlayLog) => {
  const { error } = await supabase.from("playlogs").insert([
    {
      album_id: newPlayLog.album_id,
      listeners: newPlayLog.listeners,
      date: newPlayLog.date,
    },
  ]);

  if (error) {
    console.error("Error adding playlog:", error);
    throw error;
  }
};

export const getTopPlayedAlbumsByUserID = async (userID: string): Promise<AlbumCount[]> => {
  const { data, error } = await supabase
    .from("playlogs")
    .select("album_id, vinyls(artist, album)")
    .contains("listeners", [userID]);

  if (error) {
    console.error("Error fetching user plays:", error);
    return [];
  }

  return aggregateAlbumCounts(data || []);
};

export const getSortedPlaysByQuery = async (query: string): Promise<AlbumCount[]> => {
  const { data, error } = await supabase
    .from("playlogs")
    .select("album_id, vinyls!inner(artist, album)")
    .or(`artist.ilike.%${query}%,album.ilike.%${query}%`, { foreignTable: "vinyls" });

  if (error) {
    console.error("Error fetching query plays:", error);
    return [];
  }

  return aggregateAlbumCounts(data || []);
};

export const getTopArtistsByPlay = async (userID?: string): Promise<ArtistCount[]> => {
  let playlogs: PlayLog[] = [];
  if (userID) {
    playlogs = await getPlaylogsByUserID(userID);
  } else {
    playlogs = await getPlayLogs();
  }

  const counts = playlogs.reduce((acc: Record<string, number>, curr) => {
    const artist = curr.artist || "Unknown Artist";
    acc[artist] = (acc[artist] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}