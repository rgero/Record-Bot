import supabase from "./supabase";

export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) console.error(error);
  else console.log(data);
}