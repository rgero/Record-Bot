import { SearchResponse } from "../interfaces/SearchResponse.js";
import { WantedItem } from "../interfaces/WantedItem.js";
import supabase from "./supabase.js";

/* Get the Wanted Items*/
export const getWantedItems = async () => {
  const { data, error } = await supabase.from('wanted_items').select('*');
  if (error) console.error(error);
  else console.log(data);
}

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

export const addWantedItems = async (newWantedItems: WantedItem[]) => {
  const { data, error } = await supabase.from('wanted_items').insert(newWantedItems);
  if (error) console.error(error);
  else console.log(data);
}

export const deleteWantedItem = async (wantlistitemId: string) => {
  const { data, error } = await supabase.from('wanted_items').delete().eq('id', wantlistitemId);
  if (error) console.error(error);
  else console.log(data);
}

export const updateWantedItem = async (wantlistitemId: string, updatedWantedItem: Partial<WantedItem>) => {
  const { data, error } = await supabase.from('wanted_items').update(updatedWantedItem).eq('id', wantlistitemId);
  if (error) console.error(error);
  else console.log(data);
}