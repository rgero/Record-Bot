import { Location } from "../interfaces/Location";
import supabase from "./supabase";

export const getLocations = async () => {
  const { data, error } = await supabase.from('locations').select('*');
  if (error) console.error(error);
  else console.log(data);
}

export const addLocation = async (newLocation: Location) => {
  const { data, error } = await supabase.from('locations').insert([newLocation]);
  if (error) console.error(error);
  else console.log(data);
}

export const addLocations = async (newLocations: Location[]) => {
  const { data, error } = await supabase.from('locations').insert(newLocations);
  if (error) console.error(error);
  else console.log(data);
}

export const deleteLocation = async (locationId: string) => {
  const { data, error } = await supabase.from('locations').delete().eq('id', locationId);
  if (error) console.error(error);
  else console.log(data);
}

export const updateLocation = async (locationId: string, updatedLocation: Partial<Location>) => {
  const { data, error } = await supabase.from('locations').update(updatedLocation).eq('id', locationId);
  if (error) console.error(error);
  else console.log(data);
}

export const findLocation = async (location : Partial<Location>) => {
  let query = supabase.from('locations').select('*');
  
  for (const key in location) {
    const value = (location as any)[key];
    query = query.eq(key, value);
  }
  const { data, error } = await query;
  if (error) console.error(error);
  else console.log(data);
}