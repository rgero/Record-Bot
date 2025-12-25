import { WantedItem } from "../interfaces/WantedItem";
import supabase from "./supabase";

export const getWantedItems = async () => {
  const { data, error } = await supabase.from('wanted_items').select('*');
  if (error) console.error(error);
  else console.log(data);
}

export const addWantedItem = async (newWantedItem: WantedItem) => {
  const { data, error } = await supabase.from('wanted_items').insert([newWantedItem]);
  if (error) console.error(error);
  else console.log(data);
}

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

export const findWantedItem = async (wantlistitem : Partial<WantedItem>) => {
  let query = supabase.from('wanted_items').select('*');
  
  for (const key in wantlistitem) {
    const value = (wantlistitem as any)[key];
    query = query.eq(key, value);
  }
  const { data, error } = await query;
  if (error) console.error(error);
  else console.log(data);
}