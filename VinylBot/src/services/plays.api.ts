import { ItemCount } from "../interfaces/ItemCount.js";
import { PlayLog } from "../interfaces/PlayLog.js";
import { UUID } from "node:crypto";
import { sanitizeForPostgrestIlikeOr } from "../utils/sanitizePostgrestIlike.js";
import supabase from "./supabase.js";

type PlayLogAlbumRow = {
  album_id: number;
  vinyls?: { artist?: string; album?: string } | null;
};

/// Utility Functions
const aggregateAlbumCounts = (playLogs: PlayLogAlbumRow[]): ItemCount[] => {
  const albumCountMap: Record<number, ItemCount> = {};

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

export const getPlayLogs = async (limit: number = 0): Promise<PlayLog[]> => {
  let query = supabase
    .from("playlogs")
    .select("*, vinyls(artist, album)")
    .order("date", { ascending: false });

  if (limit > 0)
  {
    query = query.limit(limit);
  }

  const { data, error } = await query;
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

/// End of Utility Functions

export const getPlaylogByIndex = async (index: number): Promise<PlayLog | null> => {
  if (index < 1) return null;

  const { data, error } = await supabase
    .from("playlogs")
    .select("*, vinyls(artist, album, imageUrl)")
    .order("date", { ascending: true })
    .range(index - 1, index - 1);

  if (error) {
    console.error("Error fetching playlog:", error);
    return null;
  }

  const targetPlaylog = data?.[0];
  if (!targetPlaylog) return null;

  return {
    ...targetPlaylog,
    artist: targetPlaylog.vinyls?.artist,
    album: targetPlaylog.vinyls?.album,
    imageUrl: targetPlaylog.vinyls?.imageUrl
  };
};

export const getPlayLogByID = async (id: number): Promise<PlayLog|null> => {
  const { data, error } = await supabase.from("playlogs").select("*, vinyls(artist, album, imageUrl)").eq("id", id).single();

  if (error) {
    console.error("Error fetching playlogs:", error);
    return null;
  }

  const playlog = data;
  return {
    ...playlog,
    artist: playlog.vinyls?.artist,
    album: playlog.vinyls?.album,
    imageUrl: playlog.vinyls?.imageUrl
  }
}

export const getPlaylogsByUserIDs = async (userIDs: UUID[], limit: number = 0): Promise<PlayLog[]> => {
  let query = supabase
    .from("playlogs")
    .select("*, vinyls(artist, album)")
    .contains("listeners", userIDs)
    .order("date", { ascending: false });

    if (limit > 0)
    {
      query = query.limit(limit);
    }

  const {data, error} = await query;

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

export const getTopPlayedAlbumsByUserID = async (userID: string): Promise<ItemCount[]> => {
  const { data, error } = await supabase
    .from("playlogs")
    .select("album_id, vinyls(artist, album)")
    .contains("listeners", [userID]);

  if (error) {
    console.error("Error fetching user plays:", error);
    return [];
  }

  return aggregateAlbumCounts((data as PlayLogAlbumRow[]) || []);
};

export const getSortedPlaysByQuery = async (query: string): Promise<ItemCount[]> => {
  const safe = sanitizeForPostgrestIlikeOr(query);
  const { data, error } = await supabase
    .from("playlogs")
    .select("album_id, vinyls!inner(artist, album)")
    .or(`artist.ilike.%${safe}%,album.ilike.%${safe}%`, { foreignTable: "vinyls" });

  if (error) {
    console.error("Error fetching query plays:", error);
    return [];
  }

  return aggregateAlbumCounts((data as PlayLogAlbumRow[]) || []);
};

export const getTopArtistsByPlay = async (userID?: string): Promise<ItemCount[]> => {
  let playlogs: PlayLog[] = [];
  if (userID) {
    playlogs = await getPlaylogsByUserIDs([userID as UUID]);
  } else {
    playlogs = await getPlayLogs();
  }

  const counts = playlogs.reduce((acc: Record<string, number>, curr) => {
    const artist = curr.artist || "Unknown Artist";
    acc[artist] = (acc[artist] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([artistName, count]): ItemCount => ({ 
      title: artistName, 
      count 
    }))
    .sort((a, b) => b.count - a.count);
}