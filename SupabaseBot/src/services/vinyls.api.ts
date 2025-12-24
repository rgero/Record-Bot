import supabase from "./supabase";

export const getVinyls = async () => {
  const { data, error } = await supabase.from('vinyls').select('*');
  if (error) console.error(error);
  else console.log(data);
}