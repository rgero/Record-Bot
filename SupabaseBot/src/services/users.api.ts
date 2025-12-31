import { User } from "../interfaces/User";
import supabase from "./supabase";

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) console.error(error);

  return data ?? [];
}

export const getUserByName = async (name: string): Promise<User|null> => {
  const {data, error} = await supabase.from('users').select('*').eq("name", name).single();
  if (error) console.log(error);
  return data ?? null;
}