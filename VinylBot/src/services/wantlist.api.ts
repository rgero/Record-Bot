import { AddStatus } from "../interfaces/AddStatus.js";
import { WantedItem } from "../interfaces/WantedItem.js";
import supabase from "./supabase.js";

export const getWantList = async (query: { type: string; term: string }): Promise<WantedItem[]> => {
  let dbQuery = supabase.from('wanted_items').select('*');

  if (query.type === 'user') {
    dbQuery = dbQuery.contains('searcher', [query.term]);
  } else if (query.type === 'search') {
    // Uses websearch full-text search syntax via PostgREST to automatically bypass punctuation parser errors
    dbQuery = dbQuery.or(`artist.wfts.${query.term},album.wfts.${query.term}`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data ?? [];
};


export const addWantedItem = async (newWantedItem: WantedItem): Promise<AddStatus> => {
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