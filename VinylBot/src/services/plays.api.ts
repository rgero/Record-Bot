import { PlayLog } from "../interfaces/PlayLog.js";
import supabase from "./supabase.js";

export const getPlayLogs = async (): Promise<PlayLog[]> => {
  const { data, error } = await supabase.from('playlogs').select('*');
  if (error) console.error(error);

  return data ?? [];
}

export const addPlayLog = async (newPlayLog: PlayLog) => {
  if (newPlayLog.date)
  {
    const newDate = new Date(newPlayLog.date).toDateString();
    newPlayLog.date = new Date(`${newDate}T12:00:00Z`);
  }

  const { error } = await supabase.from('playlogs').insert([newPlayLog]);
  if (error) console.error(error);
}

export const addPlayLogs = async (newPlayLogs: PlayLog[]) => {
  const { data, error } = await supabase.from('playlogs').insert(newPlayLogs);
  if (error) console.error(error);
  else console.log(data);
}