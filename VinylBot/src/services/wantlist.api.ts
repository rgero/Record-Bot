import { SearchResponse } from "../interfaces/SearchResponse.js";
import { WantedItem } from "../interfaces/WantedItem.js";
import supabase from "./supabase.js";

export const getWantList = async (query: { type: string; term: string }): Promise<SearchResponse[]> => {
  let dbQuery = supabase.from('wanted_items').select('artist, album');

  if (query.type === 'user') {
    dbQuery = dbQuery.contains('searcher', [query.term]);
  } else if (query.type === 'search') {
    dbQuery = dbQuery.or(`artist.ilike.%${query.term}%,album.ilike.%${query.term}%`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data;
};


export type AddStatus = "ADDED" | "DUPLICATE" | "ERROR";
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
