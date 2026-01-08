import { User } from "../interfaces/User.js";
import supabase from "./supabase.js";

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) console.error(error);

  return data ?? [];
}

export const getUserByName = async (name: string): Promise<User|null> => {
  const {data, error} = await supabase.from('users').select('*').ilike("name", name).single();
  if (error) console.log(error);
  return data ?? null;
}