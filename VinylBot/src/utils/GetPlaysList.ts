import { getPlayLogs, getPlaylogsByUserIDs } from "../services/plays.api.js";

import { CommandContext } from "./parseCommand.js";
import { Message } from "discord.js";
import { PlayLog } from "../interfaces/PlayLog.js";
import { UUID } from "node:crypto";
import { getDropdownValue } from "./discordToDropdown.js";
import { resolveUserMap } from "./resolveUserMap.js";

export const GetPlaysList = async (message: Message, context: CommandContext): Promise<Partial<PlayLog>[]> => {
  try {
    const { mentions, flags, query } = context;
    const userMap = await resolveUserMap();

    const requesterName = getDropdownValue(message.author.username, message.author.id, message.author.globalName).toLowerCase();
    const requesterIds = userMap.get(requesterName) as UUID[] | undefined;

    let limit = 0;
    if (flags.limit) {
      limit = Number(flags.limit);
    }

    let targetList: PlayLog[] = [];
    if (flags.mine) {
      targetList = await getPlaylogsByUserIDs(requesterIds as UUID[], limit);
    } else if (mentions && mentions.length > 0) {
      targetList = await getPlaylogsByUserIDs(mentions as UUID[], limit);
    } else {
      targetList = await getPlayLogs(limit);
    }

    const filterList = query
      ? targetList.filter((play) => {
          const searchTerm = query.toLowerCase();
          const artistMatch = play.artist?.toLowerCase().includes(searchTerm);
          const albumMatch = play.album?.toLowerCase().includes(searchTerm);
          return artistMatch || albumMatch;
        })
      : targetList;

    return filterList.map((play) => ({
      id: Number(play.id) ?? -1,
      artist: play.artist ?? "Unknown Artist",
      album: play.album ?? "Unknown Album",
    }));
  } catch {
    return [];
  }
};
