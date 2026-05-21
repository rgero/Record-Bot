import {ActionRowBuilder, ComponentType, EmbedBuilder, Message, StringSelectMenuBuilder} from "discord.js";

import type { Vinyl } from "../interfaces/Vinyl.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getFullVinylsByQuery } from "../services/vinyls.api.js";
import { getUserById } from "../services/users.api.js";

const limit = (str: string | undefined | null, max: number) => {
  if (!str) return "—";
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
};

const buildVinylEmbed = async (vinyl: Vinyl) => {
  let ownerValue = "Unknown";

  if (vinyl.owners?.length) {
    const users = await Promise.all(
      vinyl.owners.map((id) => getUserById(id))
    );

    const names = users.map(
      (u, i) => u?.name ?? `Unknown (${vinyl.owners[i]})`
    );

    ownerValue = names.join(", ");
  }

  return new EmbedBuilder()
    .setTitle(limit(`${escapeColons(vinyl.artist)} — ${escapeColons(vinyl.album)}`, 256))
    .setColor(0x8b5cf6)
    .setThumbnail(vinyl.imageUrl || null)
    .addFields(
      {
        name: "Purchased",
        value: limit(
          `${vinyl.purchaseDate}${
            vinyl.purchaseLocation
              ? ` @ ${vinyl.purchaseLocation.name}`
              : ""
          }`,
          1024
        ),
      },
      {
        name: "Owner",
        value: ownerValue,
      },
      {
        name: "Play Count",
        value: vinyl.playCount?.toString() ?? "0",
        inline: true,
      },
      {
        name: "Length",
        value: vinyl.length ? `${vinyl.length} min` : "Unknown",
        inline: true,
      },
      {
        name: "Tags",
        value: vinyl.tags && vinyl.tags.length > 0 ? vinyl.tags.map(tag => `\`${tag}\``).join(" ") :  "None",
      },
      {
        name: "Notes",
        value: limit(vinyl.notes, 1024),
      }
    )
    .setFooter({
      text: vinyl.doubleLP ? "💿 Double LP" : "💿 Single LP",
    });
};

const ProcessMultiple = async (message: Message, data: Vinyl[]) => {
  const options = data.slice(0, 25).map((row, i) => ({
    label: limit(`${row.artist} - ${row.album}`, 100),
    value: i.toString(),
  }));

  const row =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_album")
        .setPlaceholder("Choose an album...")
        .addOptions(options)
    );

  const reply = await message.reply({
    content: "Multiple matches found. Please select one:",
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    max: 1,
    time: 60_000,
  });

  collector.on("collect", async (int) => {
    if (int.user.id !== message.author.id) {
      return int.reply({
        content: "This menu is not for you!",
        ephemeral: true,
      });
    }

    try {
      const selected = data[parseInt(int.values[0])];

      if (!selected) {
        throw new Error("Could not find the selected vinyl data.");
      }

      const embed = await buildVinylEmbed(selected);

      await int.update({
        embeds: [embed],
        components: [],
        content: null,
      });
    } catch (e: any) {
      await int.update({
        content: `❌ Error: ${e.message}`,
        components: [],
      });
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      await reply
        .edit({
          content:
            "⚠️ Selection timed out. Please run the command again.",
          components: [],
        })
        .catch(() => null);
    }
  });
};

export const ProcessInfo = async (message: Message) => {
  const args = message.content.split(" ").slice(1);

  if (args.length === 0) {
    return message.reply(
      "Invalid query. Usage: `!info {search query}`"
    );
  }

  const term = args.join(" ");

  // 🔎 Send placeholder immediately
  const loadingMessage = await message.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription("🔎 Looking up vinyl...")
        .setColor(0x8b5cf6),
    ],
  });

  try {
    const vinyls = await getFullVinylsByQuery(term);

    if (!vinyls || vinyls.length === 0) {
      return loadingMessage.edit({
        content: `No matching records found for "${term}".`,
        embeds: [],
      });
    }

    if (vinyls.length === 1) {
      const embed = await buildVinylEmbed(vinyls[0]);

      return loadingMessage.edit({
        embeds: [embed],
        content: null,
      });
    }

    // If multiple results, remove loading message and use selector
    await loadingMessage.delete();
    return ProcessMultiple(message, vinyls);
  } catch (error) {
    console.error("Vinyl API Error:", error);

    return loadingMessage.edit({
      content:
        "There was an error fetching the vinyl data. Please try again later.",
      embeds: [],
    });
  }
};