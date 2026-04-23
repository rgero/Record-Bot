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

export const getNameById = async (id: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('name')
    .eq('id', id) // Use .eq for ID lookups
    .maybeSingle(); // Safely handles 0 or 1 results without throwing a 406 error

  if (error) {
    console.error("Error fetching username:", error.message);
    return null;
  }

  return data?.name ?? null;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id) // Use .eq for ID lookups
    .maybeSingle(); // Safely handles 0 or 1 results without throwing a 406 error

  if (error) {
    console.error("Error fetching username:", error.message);
    return null;
  }

  return data ?? null;
}