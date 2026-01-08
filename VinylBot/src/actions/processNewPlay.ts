import { getVinylByDetails, updateVinyl } from "../services/vinyls.api.js";

import { PlayLog } from "../interfaces/PlayLog.js";
import { Vinyl } from "../interfaces/Vinyl.js";
import { addPlayLog } from "../services/plays.api.js";

export const processNewPlay = async (newPlay: PlayLog) => {
  const targetAlbum: Vinyl | null = await getVinylByDetails(newPlay.artist, newPlay.album);

  if (!targetAlbum || !targetAlbum.id) {
    throw new Error(`Can't find album: ${newPlay.artist} - ${newPlay.album}`);
  }
  
  const updatedCount = (targetAlbum.playCount || 0) + 1;

  await updateVinyl(targetAlbum.id, { playCount: updatedCount });
  await addPlayLog(newPlay);
};
