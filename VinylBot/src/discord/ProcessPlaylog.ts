import { EmbedBuilder } from "@discordjs/builders";
import { Message } from "discord.js";
import { UUID } from "node:crypto";
import { escapeColons } from "../utils/escapeColons.js";
import { getPlayLogByID } from "../services/plays.api.js";
import { getUserById } from "../services/users.api.js";

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

    listenersValue = names.join(", ");

    if (listenersValue.length > 1024) {
      listenersValue = listenersValue.slice(0, 1021) + "...";
    }
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
  const args = message.content.split(" ").slice(1);

  if (args.length === 0) {
    return message.reply("Invalid query. Usage: `!playlog {id}`");
  }

  const id = parseInt(args[0]);
  if (isNaN(id)) {
    return message.reply("Invalid ID. It must be a number.");
  }

  const loadingMessage = await message.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription("🔎 Looking up Playlog...")
        .setColor(0x8b5cf6),
    ],
  });

  try {
    const playlog = await getPlayLogByID(id);

    if (!playlog) {
      return loadingMessage.edit({
        content: `No matching records found for ID "${id}".`,
        embeds: [],
      });
    }

    const playlogInfo: PlaylogInfo = {
      id: id,
      artist: playlog.artist ?? "Unknown Artist",
      album: playlog.album ?? "Unknown Album",
      imageUrl: playlog.imageUrl ?? "",
      date: playlog.date ? new Date(playlog.date) : null,
      listeners: playlog.listeners as UUID[],
    };

    const embed = await buildVinylEmbed(playlogInfo);

    return loadingMessage.edit({
      embeds: [embed],
      content: null,
    });
  } catch (error) {
    console.error("Playlog API Error:", error);

    return loadingMessage.edit({
      content: "There was an error fetching the playlog data. Please try again later.",
      embeds: [],
    });
  }
};