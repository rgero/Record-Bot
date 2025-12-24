// This is likely going to be the first one

import supabase from "./supabase";

export const getLocations = async () => {
  const { data, error } = await supabase.from('locations').select('*');
  if (error) console.error(error);
  else console.log(data);
}