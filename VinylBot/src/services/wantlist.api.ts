import { AddStatus } from "../interfaces/AddStatus.js";
import { WantedItem } from "../interfaces/WantedItem.js";
import { sanitizeForPostgrestIlikeOr } from "../utils/sanitizePostgrestIlike.js";
import supabase from "./supabase.js";

export const getWantList = async (query: { type: string; term: string }): Promise<WantedItem[]> => {
  let dbQuery = supabase.from('wanted_items').select('*');

  if (query.type === 'user') {
    dbQuery = dbQuery.contains('searcher', [query.term]);
  } else if (query.type === 'search') {
    const safe = sanitizeForPostgrestIlikeOr(query.term);
    dbQuery = dbQuery.or(`artist.ilike.%${safe}%,album.ilike.%${safe}%`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data ?? [];
};


export const addWantedItem = async (newWantedItem: WantedItem): Promise<AddStatus> => {
  // Wanted Items now has a unique constraint that the Artist + Album together must be unique.
  // Apparently this will return an error code of 23505 if violated.
  const { error } = await supabase.from('wanted_items').insert([newWantedItem]);

  if (error) {
    if (error.code === '23505') {
      return "DUPLICATE";
    }
    
    console.error("Supabase Error:", error.message);
    return "ERROR";
  }
  
  return "ADDED";
};
