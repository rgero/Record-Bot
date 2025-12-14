import axios from "axios";

let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const auth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  accessToken = res.data.access_token;
  tokenExpiresAt = Date.now() + res.data.expires_in * 1000 - 60_000;

  return accessToken;
}

export async function spotifyGet(endpoint) {
  const token = await getAccessToken();

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
