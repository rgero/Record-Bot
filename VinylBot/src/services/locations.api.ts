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