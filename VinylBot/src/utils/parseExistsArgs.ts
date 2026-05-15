import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";

export type ExistsInput =
  | { source: "spotify"; url: SpotifyUrl }
  | { source: "flags"; artist: string; album: string };

export type ParseExistsArgsResult =
  | { ok: true; input: ExistsInput }
  | { ok: false; error: string };

const stripSurroundingQuotes = (value: string) =>
  value.replace(/^["']|["']$/g, "").trim();

/** Tokenize while preserving quoted phrases as single tokens. */
export const tokenizeExistsArgs = (input: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let inQuote: '"' | "'" | null = null;

  for (const ch of input) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current) tokens.push(current);
  return tokens.map(stripSurroundingQuotes).filter(Boolean);
};

const parseArtistAlbumFlags = (text: string): ParseExistsArgsResult => {
  const tokens = tokenizeExistsArgs(text);
  let artist: string | undefined;
  let album: string | undefined;
  let active: "artist" | "album" | null = null;
  const parts: string[] = [];

  const flush = () => {
    if (!active) return;
    const value = parts.join(" ").trim();
    parts.length = 0;
    if (!value) return;
    if (active === "artist") artist = value;
    else album = value;
  };

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === "--artist" || lower === "-a") {
      flush();
      active = "artist";
      continue;
    }
    if (lower === "--album" || lower === "-l") {
      flush();
      active = "album";
      continue;
    }
    if (lower.startsWith("--")) {
      return { ok: false, error: `Unknown flag \`${token}\`. Use \`--artist\` and \`--album\`.` };
    }
    if (!active) {
      return {
        ok: false,
        error:
          "Use `!exists --artist {name} --album {name}` or paste a Spotify album link.",
      };
    }
    parts.push(token);
  }

  flush();

  if (!artist || !album) {
    return {
      ok: false,
      error: "Both `--artist` and `--album` are required (unless you provide a Spotify link).",
    };
  }

  return { ok: true, input: { source: "flags", artist, album } };
};

export const parseExistsArgs = (messageContent: string): ParseExistsArgsResult => {
  const argsText = messageContent.replace(/^!\S+\s*/i, "").trim();
  if (!argsText) {
    return {
      ok: false,
      error: "Use `!exists --artist {name} --album {name}` or paste a Spotify album link.",
    };
  }

  const spotify = parseSpotifyUrl(argsText);
  if (spotify) {
    return { ok: true, input: { source: "spotify", url: spotify } };
  }

  return parseArtistAlbumFlags(argsText);
};
