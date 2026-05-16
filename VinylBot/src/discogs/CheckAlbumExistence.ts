import { DiscogResponse } from "../interfaces/DiscogResponse.js";
import { DiscogsClient } from "@lionralfs/discogs-client";
import { compareTwoStrings } from "string-similarity";

const TITLE_SPLIT = /\s[-–]\s/;

/** Lowercase and strip punctuation for fuzzy comparison only — never used as regex input. */
const normalize = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const extractArtistFromTitle = (discogsTitle: string) => {
  const parts = discogsTitle.split(TITLE_SPLIT);
  return parts.length > 1 ? parts[0] : "";
};

const extractAlbumTitle = (discogsTitle: string) => {
  const parts = discogsTitle.split(TITLE_SPLIT);
  return parts.length > 1 ? parts.slice(1).join(" - ") : discogsTitle;
};

const isVinylVersion = (v: { format?: string; major_formats?: string[]; title?: string }) => {
  const formatStr = (v.format || "").toLowerCase();
  const majorFormats = (v.major_formats || []).map((f) => f.toLowerCase());
  const isVinyl = formatStr.includes("vinyl") || majorFormats.includes("vinyl");
  const isPromo = (v.title || "").toLowerCase().includes("promo");
  return isVinyl && !isPromo;
};

/** Standalone releases (no master) expose formats on the release resource. */
export const isVinylReleaseFormat = (
  formats?: Array<{ name?: string; descriptions?: string[] }>
) =>
  (formats ?? []).some((f) => {
    const name = (f.name ?? "").toLowerCase();
    const descriptions = (f.descriptions ?? []).join(" ").toLowerCase();
    return name.includes("vinyl") || descriptions.includes("vinyl");
  });

export const scoreMatch = (artist: string, album: string, discogsTitle: string) => {
  const targetArtist = normalize(artist);
  const targetAlbum = normalize(album);
  const discogsArtist = normalize(extractArtistFromTitle(discogsTitle));
  const discogsAlbum = normalize(extractAlbumTitle(discogsTitle));
  const selfTitled = targetArtist.length > 0 && targetArtist === targetAlbum;

  const artistScore =
    discogsArtist.length > 0
      ? compareTwoStrings(targetArtist, discogsArtist)
      : compareTwoStrings(`${targetArtist} ${targetAlbum}`, discogsTitle.toLowerCase());

  const albumScore = compareTwoStrings(targetAlbum, discogsAlbum);
  const minAlbumScore = selfTitled ? 0.65 : 0.75;

  return { artistScore, albumScore, minAlbumScore, passes: artistScore >= 0.55 && albumScore >= minAlbumScore };
};

const notFound = (artist: string, album: string): DiscogResponse => ({
  title: `${artist} - ${album}`,
  exists: false,
});

type SearchResult = {
  id: number;
  type: string;
  title: string;
  cover_image?: string;
};

const rankResults = (artist: string, album: string, results: SearchResult[]) =>
  results
    .map((result) => ({
      result,
      ...scoreMatch(artist, album, result.title),
    }))
    .filter((r) => r.passes)
    .sort((a, b) => b.albumScore + b.artistScore - (a.albumScore + a.artistScore));

export const CheckAlbumExistence = async (
  artist: string,
  album: string
): Promise<DiscogResponse> => {
  const consumerKey = process.env.DISCOG_KEY;
  const consumerSecret = process.env.DISCOG_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error("Discogs DISCOG_KEY and DISCOG_SECRET must be set in the environment.");
  }

  const client = new DiscogsClient({
    auth: {
      method: "discogs",
      consumerKey,
      consumerSecret,
    },
  });

  const db = client.database();
  const query = `${artist} ${album}`;
  const masterSearchParams = { type: "master" as const, per_page: 50 };

  let masterResults =
    (
      await db.search({
        ...masterSearchParams,
        artist,
        release_title: album,
      })
    ).data.results ?? [];

  if (!masterResults.length) {
    masterResults =
      (await db.search({ ...masterSearchParams, query })).data.results ?? [];
  }

  for (const { result } of rankResults(artist, album, masterResults)) {
    const versionsRes = await db.getMasterVersions(result.id);
    const versions = versionsRes.data.versions;
    if (!versions?.length) continue;

    if (versions.some(isVinylVersion)) {
      return {
        title: result.title,
        cover: result.cover_image,
        exists: true,
      };
    }
  }

  // Some pressings (e.g. bbno$ — bbno$) are orphan releases with no master_id.
  const releaseResults =
    (
      await db.search({
        per_page: 50,
        query,
      })
    ).data.results?.filter((r) => r.type === "release") ?? [];

  for (const { result } of rankResults(artist, album, releaseResults)) {
    const releaseRes = await db.getRelease(result.id);
    const title = releaseRes.data.title ?? result.title;
    const isPromo = title.toLowerCase().includes("promo");
    if (!isPromo && isVinylReleaseFormat(releaseRes.data.formats)) {
      return {
        title: result.title,
        cover: result.cover_image ?? releaseRes.data.images?.[0]?.uri,
        exists: true,
      };
    }
  }

  return notFound(artist, album);
};
