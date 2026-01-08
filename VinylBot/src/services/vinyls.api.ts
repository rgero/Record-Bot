import { SearchResponse } from "../interfaces/SearchResponse.js";
import { Vinyl } from "../interfaces/Vinyl.js";
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

export const getVinylsLikedByUserID = async (userID: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('*')
    .contains("likedBy", [userID]);

  if (error) throw error;
  return data ?? [];
};

export const getVinylsByQuery = async (query: { type: string; term: string }): Promise<SearchResponse[]> => {
  let dbQuery = supabase.from('vinyls').select('id, artist, album');

  if (query.type === 'user') {
    dbQuery = dbQuery.contains('owners', [query.term]);
  } else if (query.type === 'search') {
    dbQuery = dbQuery.or(`artist.ilike.%${query.term}%,album.ilike.%${query.term}%`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data ?? [];
};

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

export const getVinylByDetails = async (artist: string, album: string): Promise<Vinyl | null> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select("*")
    .ilike("artist", artist)
    .ilike("album", album)
    .maybeSingle();

  if (error) throw error;
  return data ? data : null;
};

export const searchVinyls = async (term: string): Promise<SearchResponse[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('id, artist, album')
    .or(`artist.ilike.%${term}%,album.ilike.%${term}%`);

  if (error) throw error;
  return data ?? [];
};

/**
 * MUTATIONS
 */
export const addVinyl = async (newVinyl: Omit<Vinyl, 'id'>): Promise<Vinyl> => {
  const { data, error } = await supabase
    .from('vinyls')
    .insert([newVinyl])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const addVinyls = async (newVinyls: Omit<Vinyl, 'id'>[]): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .insert(newVinyls)
    .select();

  if (error) throw error;
  return data ?? [];
};

export const deleteVinyl = async (vinylId: string | number): Promise<void> => {
  const { error } = await supabase
    .from('vinyls')
    .delete()
    .eq('id', vinylId);

  if (error) throw error;
};

export const updateVinyl = async (vinylId: number, updatedVinyl: Partial<Vinyl>): Promise<Vinyl> => {
  const { data, error } = await supabase
    .from('vinyls')
    .update(updatedVinyl)
    .eq('id', vinylId)
    .select()
    .single();

  if (error) throw error;
  return data;
};