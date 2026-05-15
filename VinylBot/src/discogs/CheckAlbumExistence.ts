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

const scoreMatch = (artist: string, album: string, discogsTitle: string) => {
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
  const searchParams = { type: "master" as const, per_page: 25 };

  let results =
    (
      await db.search({
        ...searchParams,
        artist,
        release_title: album,
      })
    ).data.results ?? [];

  if (!results.length) {
    results =
      (
        await db.search({
          ...searchParams,
          query: `${artist} ${album}`,
        })
      ).data.results ?? [];
  }

  if (!results.length) return notFound(artist, album);

  const ranked = results
    .map((r) => ({
      result: r,
      ...scoreMatch(artist, album, r.title),
    }))
    .filter((r) => r.passes)
    .sort((a, b) => b.albumScore + b.artistScore - (a.albumScore + a.artistScore));

  for (const { result } of ranked) {
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

  return notFound(artist, album);
};
