import { ItemCount } from "../interfaces/ItemCount.js";
import { UUID } from "node:crypto";
import { Vinyl } from "../interfaces/Vinyl.js";
import { VinylSearchQuery } from "../interfaces/VinylSearchQuery.js";
import { sortVinyls } from "../utils/sortVinyls.js";
import supabase from "./supabase.js";

/**
 * FETCHERS
*/
export const getVinyls = async (): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('*')
    .order('artist', { ascending: true });

  if (error) throw error;
  return data ?? [];
};


export const getVinylsBySearchQuery = async (searchQuery: VinylSearchQuery): Promise<Vinyl[]> => {
  let dbQuery = supabase.from('vinyls').select(`*, purchaseLocation:locations (name)`);

  if (searchQuery.owners && searchQuery.owners.length > 0) {
    dbQuery = dbQuery.contains('owners', searchQuery.owners);
  }

  if (searchQuery.search) {
    dbQuery = dbQuery.or(`artist.ilike.%${searchQuery.search}%,album.ilike.%${searchQuery.search}%`)
  }

  if (searchQuery.tags && searchQuery.tags.length > 0) {
    dbQuery = dbQuery.contains('tags', searchQuery.tags);
  }

  const { data, error } = await dbQuery;

  if (error) throw error;
  return data ?? [];
};


export const getVinylsLikedByUserID = async (userID: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('*')
    .contains("likedBy", [userID]);

  if (error) throw error;
  return data ?? [];
};

export const getVinylsByQuery = async (query: { type: string; term: string }): Promise<Vinyl[]> => {
  let dbQuery = supabase.from('vinyls').select('*');

  if (query.type === 'user') {
    dbQuery = dbQuery.contains('owners', [query.term]);
  } else if (query.type === 'search') {
    dbQuery = dbQuery.or(`artist.ilike.%${query.term}%,album.ilike.%${query.term}%`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data ?? [];
};

export const getFullVinylsByQuery = async (term: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase.from('vinyls').select(`*, purchaseLocation:locations (name)`).or(`artist.ilike.%${term}%,album.ilike.%${term}%`);
  if (error) throw error;
  return data ?? [];
}

export const getVinylID = async (artist: string, album: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select("id")
    .ilike("artist", artist)
    .ilike("album", album)
    .maybeSingle();

  if (error) throw error;
  return data ? data.id : null;
};

export const getVinylsByTags = async (tags: string[]): Promise<Vinyl[]> => {
  const normalizedTags = tags.map(item => item.trim().toLowerCase());
  const { data, error } = await supabase
    .from('vinyls')
    .select('*')
    .contains("tags", normalizedTags);

  if (error) throw error;
  return data ?? [];
}

/**
 * MUTATIONS
*/
export type AddStatus = "ADDED" | "DUPLICATE" | "ERROR";
export const addVinyl = async (newVinyl: Omit<Vinyl, 'id'>): Promise<AddStatus> => {
  const { data, error } = await supabase.from("vinyls").insert({ ...newVinyl, playCount: 0 }).select('*').single();
  if (error) {
    if (error.code === '23505') {
      return "DUPLICATE";
    }
    
    console.error("Supabase Error:", error.message);
    return "ERROR";
  }
  
  return "ADDED";
};

export const getArtistVinylCounts = async (): Promise<ItemCount[]> => {
  const { data, error } = await supabase.from('vinyls').select('artist')
  
  if (error) throw error;

  const counts = data.reduce((acc: Record<string, number>, curr) => {
    acc[curr.artist] = (acc[curr.artist] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count);
};

export const getVinylsByPlayCount = async (): Promise<ItemCount[]> => {
  const { data, error } = await supabase.from('vinyls').select('*').order('playCount', { ascending: false })
  if (error) throw error;
  
  return data.map(vinyl => ({ title: `${vinyl.artist} - ${vinyl.album}`, count: vinyl.playCount || 0 }));
};

export const getArtistVinylCountByUserId = async (userID: string): Promise<ItemCount[]> => {
  const { data, error } = await supabase.from('vinyls').select('artist').contains('owners', [userID]);
  if (error) throw error;
  
  const counts = data.reduce((acc: Record<string, number>, curr) => {
    acc[curr.artist] = (acc[curr.artist] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count);
}

export const haveVinyl = async (query: {artist: string, album: string}): Promise<boolean> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select("id")
    .ilike("artist", query.artist)
    .ilike("album", query.album)
    .maybeSingle();
  
  if (error) throw error;
  return !!data;
}

export const getUnplayedVinyls = async (userID: string, mention?: string, query?: string, sort?: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase.rpc('get_unplayed_vinyls', { target_user_id: userID });

  if (error) {
    console.error('Error fetching vinyls:', error);
    return [];
  }

  let filteredData: Vinyl[] = data || [];

  // Filter by mention (owner)
  if (mention) {
    filteredData = filteredData.filter((item: Vinyl) => 
      Array.isArray(item.owners) && item.owners.includes(mention)
    );
  }

  // Filter by search query
  if (query) {
    const lowerQuery = query.toLowerCase();
    filteredData = filteredData.filter((item: Vinyl) => {
      return (
        item.artist.toLowerCase().includes(lowerQuery) || 
        item.album.toLowerCase().includes(lowerQuery) || 
        item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  // Sort the data
  if (sort) {
    filteredData = sortVinyls(filteredData, sort);
  }

  return filteredData;
};

export const getUnplayedVinylCounts = async (targetIDs: UUID[]): Promise<ItemCount[]> => {
  const { data, error } = await supabase.rpc('get_unplayed_counts', { target_user_ids: targetIDs });

  if (error) {
    console.error('Error fetching vinyls:', error);
    return [];
  }

  return data ?? [];
}