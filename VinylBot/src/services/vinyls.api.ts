import { AddStatus } from "../interfaces/AddStatus.js";
import { ItemCount } from "../interfaces/ItemCount.js";
import { UUID } from "node:crypto";
import { Vinyl } from "../interfaces/Vinyl.js";
import { VinylSearchQuery } from "../interfaces/VinylSearchQuery.js";
import { sortItems } from "../utils/sortItems.js";
import supabase from "./supabase.js";

type VinylRow = Vinyl & {
  playlogs?: { count?: number }[];
};

const VINYL_SELECT = "*, playlogs(count)";
const VINYL_WITH_LOCATION_SELECT = `${VINYL_SELECT}, purchaseLocation:locations (name)`;

const hydrateVinyls = (rows: VinylRow[]): Vinyl[] => rows.map(({ playlogs, ...vinyl }) => ({
  ...vinyl,
  playCount: playlogs?.[0]?.count ?? 0,
}));

const countItemsByKey = (items: { key: string }[]): ItemCount[] => {
  const counts = items.reduce<Record<string, number>>((result, item) => {
    result[item.key] = (result[item.key] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
};

const normalizeSearchText = (value: string): string => value.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, "");

const matchesVinylSearch = (vinyl: Vinyl, search: string): boolean => {
  const normalizedSearch = normalizeSearchText(search);
  const artist = normalizeSearchText(vinyl.artist);
  const album = normalizeSearchText(vinyl.album);
  const tags = vinyl.tags?.some((tag) => normalizeSearchText(tag).includes(normalizedSearch));

  return artist.includes(normalizedSearch) || album.includes(normalizedSearch) || Boolean(tags);
};

/**
 * Vinyl fetchers
*/
export const getVinyls = async (): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select(VINYL_SELECT)
    .order("artist", { ascending: true });

  if (error) throw error;
  return hydrateVinyls((data ?? []) as VinylRow[]);
};

export const getVinylsBySearchQuery = async (searchQuery: VinylSearchQuery): Promise<Vinyl[]> => {
  let dbQuery = supabase.from("vinyls").select(VINYL_WITH_LOCATION_SELECT);

  if (searchQuery.owners?.length) {
    dbQuery = dbQuery.contains("owners", searchQuery.owners);
  }

  if (searchQuery.search) {
    dbQuery = dbQuery.or(
      `artist.wfts.${searchQuery.search},album.wfts.${searchQuery.search}`,
    );
  }

  if (searchQuery.tags?.length) {
    dbQuery = dbQuery.contains("tags", searchQuery.tags);
  }

  const { data, error } = await dbQuery;

  if (error) throw error;
  return hydrateVinyls((data ?? []) as VinylRow[]);
};

export const getVinylsLikedByUserID = async (userId: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select(VINYL_SELECT)
    .contains("likedBy", [userId]);

  if (error) throw error;
  return hydrateVinyls((data ?? []) as VinylRow[]);
};

export const getVinylsByQuery = async (query: { type: string; term: string }): Promise<Vinyl[]> => {
  let dbQuery = supabase.from("vinyls").select(VINYL_SELECT);

  if (query.type === "user") {
    dbQuery = dbQuery.contains("owners", [query.term]);
  } else if (query.type === "search") {
    dbQuery = dbQuery.or(`artist.wfts.${query.term},album.wfts.${query.term}`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return hydrateVinyls((data ?? []) as VinylRow[]);
};

export const getFullVinylsByQuery = async (term: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select(VINYL_WITH_LOCATION_SELECT)
    .or(`artist.wfts.${term},album.wfts.${term}`);

  if (error) throw error;
  return hydrateVinyls((data ?? []) as VinylRow[]);
};

export const getVinylID = async (artist: string, album: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select("id")
    .or(`artist.wfts.${artist},album.wfts.${album}`)
    .maybeSingle();

  if (error) throw error;
  return data ? data.id : null;
};

export const getVinylsByTags = async (tags: string[]): Promise<Vinyl[]> => {
  const normalizedTags = tags.map((tag) => tag.trim().toLowerCase());
  const { data, error } = await supabase
    .from("vinyls")
    .select(VINYL_SELECT)
    .contains("tags", normalizedTags);

  if (error) throw error;
  return hydrateVinyls((data ?? []) as VinylRow[]);
};

/**
 * Vinyl mutations
*/
export const addVinyl = async (newVinyl: Omit<Vinyl, 'id'>): Promise<AddStatus> => {
  const { error } = await supabase
    .from("vinyls")
    .insert({ ...newVinyl })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return "DUPLICATE";

    console.error("Supabase Error:", error.message);
    return "ERROR";
  }

  return "ADDED";
};

export const getArtistVinylCounts = async (): Promise<ItemCount[]> => {
  const { data, error } = await supabase.from("vinyls").select("artist");

  if (error) throw error;

  return countItemsByKey((data ?? []).map(({ artist }) => ({ key: artist })));
};

export const getVinylsByPlayCount = async (): Promise<ItemCount[]> => {
  const { data, error } = await supabase.from("vinyls").select(VINYL_SELECT);
  if (error) throw error;

  return hydrateVinyls((data ?? []) as VinylRow[])
    .map(({ artist, album, playCount = 0 }) => ({ title: `${artist} - ${album}`, count: playCount }))
    .sort((a, b) => b.count - a.count);
};

export const getArtistVinylCountByUserId = async (userId: string): Promise<ItemCount[]> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select("artist")
    .contains("owners", [userId]);

  if (error) throw error;

  return countItemsByKey((data ?? []).map(({ artist }) => ({ key: artist })));
};

export const haveVinyl = async (query: { artist: string; album: string }): Promise<boolean> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select("id")
    .eq("artist", query.artist)
    .eq("album", query.album)
    .maybeSingle();
  
  if (error) throw error;
  return !!data;
};

export const getUnplayedVinyls = async (userId: string, query?: string, sort?: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase.rpc("get_unplayed_vinyls", { target_user_id: userId });

  if (error) {
    console.error("Error fetching vinyls:", error);
    return [];
  }

  let filteredVinyls: Vinyl[] = data ?? [];

  if (query) {
    filteredVinyls = filteredVinyls.filter((vinyl) => matchesVinylSearch(vinyl, query));
  }

  if (sort) {
    filteredVinyls = sortItems(filteredVinyls, sort) as Vinyl[];
  }

  return filteredVinyls;
};

export const getUnplayedVinylCounts = async (targetUserIds: UUID[]): Promise<ItemCount[]> => {
  const { data, error } = await supabase.rpc("get_unplayed_counts", { target_user_ids: targetUserIds });

  if (error) {
    console.error("Error fetching vinyls:", error);
    return [];
  }

  return data ?? [];
};