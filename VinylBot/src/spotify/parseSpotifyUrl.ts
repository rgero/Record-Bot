import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl.js";

export const parseSpotifyUrl = (text: string): SpotifyUrl|null => {
  const match = text.match(
    /open\.spotify\.com\/(album|track|artist)\/([a-zA-Z0-9]+)/
  );

  if (!match) return null;

  return {
    type: match[1],
    id: match[2],
  };
}
