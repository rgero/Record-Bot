import { getVinylByDetails, updateVinyl } from "../services/vinyls.api";

import { PlayLog } from "../interfaces/PlayLog";
import { Vinyl } from "../interfaces/Vinyl";
import { addPlayLog } from "../services/plays.api";

export const processNewPlay = async (newPlay: PlayLog) => {
  const targetAlbum: Vinyl | null = await getVinylByDetails(newPlay.artist, newPlay.album);

  if (!targetAlbum || !targetAlbum.id) {
    throw new Error(`Can't find album: ${newPlay.artist} - ${newPlay.album}`);
  }
  
  const updatedCount = (targetAlbum.playCount || 0) + 1;

  await updateVinyl(targetAlbum.id, { playCount: updatedCount });
  await addPlayLog(newPlay);
};
