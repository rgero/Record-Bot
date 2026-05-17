import { EmbedBuilder, Message } from "discord.js";
import { getPlayLogByID, getPlaylogByIndex } from "../services/plays.api.js";

import { UUID } from "node:crypto";
import { escapeColons } from "../utils/escapeColons.js";
import { getUserById } from "../services/users.api.js";
import { parseCommand } from "../utils/parseCommand.js";

interface PlaylogInfo {
  id: number;
  artist?: string;
  album?: string;
  imageUrl?: string;
  date: Date | null;
  listeners?: UUID[];
}

const limit = (str: string | undefined | null, max: number) => {
  if (!str) return "—";
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
};

const buildVinylEmbed = async (playlog: PlaylogInfo) => {
  let listenersValue = "Unknown";

  if (playlog.listeners?.length) {
    const users = await Promise.all(
      playlog.listeners.map((id) => getUserById(id))
    );

    const names = users.map(
      (u, i) => u?.name ?? `Unknown (${playlog.listeners![i]})`
    );

    listenersValue = limit(names.join(", "), 1024);
  }

  return new EmbedBuilder()
    .setTitle(limit(`Playlog #${playlog.id}`, 256))
    .setDescription(`${escapeColons(playlog.artist)} - ${escapeColons(playlog.album)}`)
    .setColor(0x8b5cf6)
    .setImage(playlog.imageUrl || null) 
    .addFields(
      {
        name: "Listeners",
        value: listenersValue,
        inline: true,
      },
      {
        name: "Date",
        value: playlog.date 
          ? `<t:${Math.floor(playlog.date.getTime() / 1000)}:d>` 
          : "Unknown",
        inline: true,
      }
    );
};

export const ProcessPlaylog = async (message: Message) => {
  const parsed = await parseCommand(message);
  if (!parsed.ok) {
    if (parsed.error) await message.reply(`❌ ${parsed.error}`);
    return;
  }
  
  const { flags, query } = parsed.context;

  let id: number;
  let useIndex = false;

  if (flags.number && typeof flags.number === "string") {
    id = parseInt(flags.number);
    useIndex = true;
  } else {
    id = parseInt(query);
  }

  if (isNaN(id)) {
    return message.reply("❌ Invalid ID. It must be a number.");
  }

  const loadingMessage = await message.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription("🔎 Looking up Playlog...")
        .setColor(0x8b5cf6),
    ],
  });

  try {
    const playlog = useIndex 
      ? await getPlaylogByIndex(id) 
      : await getPlayLogByID(id);

    if (!playlog) {
      return loadingMessage.edit({
        content: `❌ No matching records found for ID "${id}".`,
        embeds: [],
      });
    }

    const playlogInfo: PlaylogInfo = {
      id: id,
      artist: playlog.artist ?? "Unknown Artist",
      album: playlog.album ?? "Unknown Album",
      imageUrl: playlog.imageUrl ?? "",
      date: playlog.date ? new Date(playlog.date) : null,
      listeners: (playlog.listeners as UUID[]) || [],
    };

    const embed = await buildVinylEmbed(playlogInfo);

    return loadingMessage.edit({
      embeds: [embed],
      content: null,
    });
  } catch (error) {
    console.error("Playlog API Error:", error);

    return loadingMessage.edit({
      content: "⚠️ There was an error fetching the playlog data. Please try again later.",
      embeds: [],
    });
  }
};