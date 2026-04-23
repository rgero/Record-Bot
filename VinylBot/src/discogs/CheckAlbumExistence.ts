import { DiscogResponse } from "../interfaces/DiscogResponse.js";
import { DiscogsClient } from "@lionralfs/discogs-client";
import { compareTwoStrings } from "string-similarity";

const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();

const extractAlbumTitle = (discogsTitle: string) => {
  const parts = discogsTitle.split(/\s[-–]\s/);
  return parts.length > 1 ? parts.slice(1).join(" - ") : discogsTitle;
};

export const CheckAlbumExistence = async (artist: string, album: string): Promise<DiscogResponse|null> => {
  const client = new DiscogsClient({
    auth: {
      method: "discogs",
      consumerKey: process.env.DISCOG_KEY!,
      consumerSecret: process.env.DISCOG_SECRET!
    }
  });

  const db = client.database();

  const search = await db.search({
    query: `${artist} ${album}`,
    type: "master",
    per_page: 10
  });

  const results = search.data.results;
  if (!results.length) return {
    title: `${artist} - ${album}`,
    exists: false,
  };

  const targetAlbum = normalize(album);

  const scoredResults = results.map(r => ({
      ...r,
      score: compareTwoStrings(
        `${artist} ${album}`.toLowerCase(),
        r.title.toLowerCase()
      )
    })).filter(r => r.score > 0.4).sort((a, b) => b.score - a.score);

  for (const match of scoredResults) {
    const discogsAlbum = normalize(extractAlbumTitle(match.title));
    const albumScore = compareTwoStrings(targetAlbum, discogsAlbum);
    if (albumScore < 0.8) continue;

    const versionsRes = await db.getMasterVersions(match.id);
    const versions = versionsRes.data.versions;
    if (!versions) continue;

    const hasVinyl = versions.some(v => {
      const formatStr = (v.format || "").toLowerCase();
      const majorFormats = (v.major_formats || []).map(f => f.toLowerCase());
      const isVinyl =
        formatStr.includes("vinyl") || majorFormats.includes("vinyl");
      const isPromo = (v.title || "").toLowerCase().includes("promo");
      return isVinyl && !isPromo;
    });

    if (hasVinyl) return {
      title: match.title,
      cover: match.cover_image,
      exists: true
    };
  }

  return null;
};
