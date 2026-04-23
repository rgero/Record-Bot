import { AlbumCount } from "../interfaces/AlbumCount.js";
import { Location } from "../interfaces/Location.js";
import { VinylWithLocation } from "../interfaces/Vinyl.js";
import supabase from "./supabase.js";

export const getLocations = async (): Promise<Location[]> => {
  const { data, error } = await supabase.from('locations').select('*');
  if (error) console.error(error);

  return data ?? [];
}

export const getPhysicalLocations = async (): Promise<Location[]> => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .not("address", "is", null)
    .neq("address", "");

  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
};

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

const countVinylsByLocation = (vinyls: VinylWithLocation[]): AlbumCount[] => {
  const counts: Record<string, number> = vinyls.reduce((acc, curr) => {
    const locName = curr.purchaseLocation.name;
    acc[locName] = (acc[locName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
};

export const getLocationsByPurchaseCountForID = async (userID: string): Promise<AlbumCount[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('owners,purchaseLocation:locations(name)')
    .contains('owners', [userID]);

  if (error) throw error;
  if (!data) return [];
  
  const vinyls = data as unknown as VinylWithLocation[];

  return countVinylsByLocation(vinyls);
};

export const getLocationsByPurchaseCount = async (): Promise<AlbumCount[]> => {
  const { data, error } = await supabase.from('locations').select('*').order('purchaseCount', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((loc: any) => ({
    title: loc.name,
    count: loc.purchaseCount,
  }));
};