import axios from "axios";

const getSpotifyAccessToken = async (): Promise<string> => {
  const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const { data } = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return data.access_token;
};

export const getAlbumArtURL = async (albumId: string): Promise<string> => {
  const accessToken = await getSpotifyAccessToken();
  const { data } = await axios.get(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return data.images?.[0]?.url ?? "";
};


export const getAlbumURL = async (artist: string, album: string): Promise<string> => {
  const accessToken = await getSpotifyAccessToken();

  const { data } = await axios.get(
    "https://api.spotify.com/v1/search",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        q: `album:${album} artist:${artist}`,
        type: "album",
        limit: 1,
      },
    }
  );

  return data.albums.items[0]?.external_urls?.spotify ?? "";
};


export const getAlbumArtFromSpotify = async (artist: string, album: string): Promise<string> => {
  const url = await getAlbumURL(artist, album);
  if (!url) return "";
  const albumIdMatch = url.match(/album\/([a-zA-Z0-9]+)/);
  if (!albumIdMatch) return "";
  const albumId = albumIdMatch[1];
  return await getAlbumArtURL(albumId);
}

export const spotifyGet = async (endpoint:string): Promise<any> => {
  const token = await getSpotifyAccessToken();

  const res = await axios.get(
    `https://api.spotify.com/v1/${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
}