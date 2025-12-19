import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";

export const ProcessPlay = async (message) => {
  // Get rid of the command
  const params = message.content.split(" ").slice(1);
  
  console.log(params);

  const requester = message.author?.username || "Unknown";
  const username = getDropdownValue(requester);

  // Try to parse for spotify
  const spotify = parseSpotifyUrl(params);
  if (spotify)
  {
    ProcessSpotifyPlay(spotify, username);
  }
}

const ProcessSpotifyPlay = async (spotify, useranme) => {
  const data = await spotifyGet(`${spotify.type}s/${spotify.id}`);
  
  const artists = data.artists?.map(a => a.name).join(", ") || "";
  const albumName = data.name || "";

  ProcessAddAlbum(artists, albumName, userName)
}