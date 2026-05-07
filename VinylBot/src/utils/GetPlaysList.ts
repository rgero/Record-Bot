import { Message } from "discord.js";
import { SearchResponse } from "../interfaces/SearchResponse.js";
import { UUID } from "node:crypto";
import { getDropdownValue } from "./discordToDropdown.js";
import { getPlaylogsByUserIDs } from "../services/plays.api.js";
import { parseCommand } from "./parseCommand.js";
import { resolveUserMap } from "./resolveUserMap.js";

export const GetPlaysList = async (message: Message): Promise<SearchResponse[]> => {
  try {
    let context = await parseCommand(message);
    if (!context) return [];

    const { mentions, flags, query } = context;
    const userMap = await resolveUserMap();

    const requesterName = getDropdownValue(message.author.username).toLowerCase();
    const requesterIds = userMap.get(requesterName) as UUID[] | undefined;

    const targetIDs: UUID[] = (mentions && mentions.length > 0) ? (mentions as UUID[]) : (requesterIds || []);
    
    let limit: number = 0;
    if (flags.limit)
    {
      limit = Number(flags.limit);
    }

    const targetList = await getPlaylogsByUserIDs(targetIDs, limit);

    const filterList = query ? targetList.filter(play => {
      const searchTerm = query.toLowerCase();
      const artistMatch = play.artist?.toLowerCase().includes(searchTerm);
      const albumMatch = play.album?.toLowerCase().includes(searchTerm);
      return artistMatch || albumMatch;
    }) : targetList;  

    return filterList.map((play) => ({
      id: Number(play.id) ?? -1,
      artist: play.artist ?? "Unknown Artist",
      album: play.album ?? "Unknown Album",
    }));

  } catch {
    throw new Error("Error: Cannot get plays list")
  }
}