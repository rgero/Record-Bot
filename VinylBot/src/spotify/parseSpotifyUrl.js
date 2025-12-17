export function parseSpotifyUrl(text) {
  const match = text.match(
    /open\.spotify\.com\/(album|track|artist)\/([a-zA-Z0-9]+)/
  );

  if (!match) return null;

  return {
    type: match[1],
    id: match[2],
    index: match.index, // <-- capture where the match starts
    length: match[0].length, // <-- capture match length
  };
}
