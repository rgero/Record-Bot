import { PlayLog } from "../interfaces/PlayLog";
import supabase from "./supabase";

export const getPlayLogs = async (): Promise<PlayLog[]> => {
  const { data, error } = await supabase.from('play_log').select('*');
  if (error) console.error(error);

  return data ?? [];
}

export const addPlayLog = async (newPlayLog: PlayLog) => {
  const { data, error } = await supabase.from('play_log').insert([newPlayLog]);
  if (error) console.error(error);
  else console.log(data);
}

export const addPlayLogs = async (newPlayLogs: PlayLog[]) => {
  const { data, error } = await supabase.from('play_log').insert(newPlayLogs);
  if (error) console.error(error);
  else console.log(data);
}