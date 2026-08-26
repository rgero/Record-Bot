import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message, MessageActionRowComponentBuilder } from "discord.js";

import { CheckAlbumExistence } from "../discogs/CheckAlbumExistence.js";
import { addWantedItem } from "../services/wantlist.api.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getSpotifyData } from "../spotify/getSpotifyData.js";
import { getUserByName } from "../services/users.api.js";
import { parseExistsArgs } from "../utils/parseExistsArgs.js";

const buildRow = ({ disabled = false }: { disabled?: boolean }) => {
  const button = new ButtonBuilder()
    .setCustomId("add_to_want")
    .setLabel("👍 Want")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled);

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button);
};

export const ProcessCheckExists = async (message: Message) => {
  const parsed = parseExistsArgs(message.content);
  if (!parsed.ok) {
    return message.reply(`❌ ${parsed.error}`);
  }

  const reply = await message.reply("🔍 Checking Discogs for a vinyl pressing...");

  try {
    let artists = "";
    let albumName = "";

    if (parsed.input.source === "spotify") {

      if (message.guildId)
      {
        await message.suppressEmbeds(true);
      }
      
      const spotifyData = await getSpotifyData(parsed.input.url);
      artists = spotifyData.artists;
      albumName = spotifyData.albumName;
    } else {
      artists = parsed.input.artist;
      albumName = parsed.input.album;
    }

    const response = await CheckAlbumExistence(artists, albumName);

    const resultEmbed = new EmbedBuilder()
      .setTitle(`Result: ${escapeColons(response.title)}`)
      .setColor(response.exists ? 0x2ecc71 : 0xe74c3c)
      .setThumbnail(response.cover ?? "https://records.roymond.net/placeholder-album.png")
      .addFields(
        {
          name: "Queried",
          value: `**${escapeColons(artists)}** — ${escapeColons(albumName)}`,
          inline: false,
        },
        {
          name: "Vinyl on Discogs",
          value: response.exists ? "✅ Found" : "❌ Not found",
          inline: true,
        }
      );

    const sentMessage = await reply.edit({
      content: null,
      embeds: [resultEmbed],
      components: [buildRow({ disabled: !response.exists })],
    });

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 2 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the person who initiated the search can use these buttons.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "add_to_want") {
        await interaction.deferUpdate();

        try {
          const userRecord = await getUserByName(getDropdownValue(message.author.username, message.author.id));

          if (!userRecord) {
            return interaction.followUp({ content: "⚠️ User not found in system.", ephemeral: true });
          }

          const status = await addWantedItem({
            artist: artists,
            album: albumName,
            imageUrl: response.cover,
            searcher: [userRecord.id],
          });

          const isDuplicate = status === "DUPLICATE";
          if (status === "ERROR") {
            return interaction.followUp({
              content: "❌ System error: Could not save to database.",
              ephemeral: true,
            });
          }

          const successEmbed = new EmbedBuilder()
            .setTitle(isDuplicate ? "⚠️ Already Listed" : "✅ Added to Wantlist")
            .setDescription(`**${escapeColons(artists)}** - ${escapeColons(albumName)}`)
            .setColor(isDuplicate ? 0xf1c40f : 0x1db954)
            .setThumbnail(response.cover ?? "https://records.roymond.net/placeholder-album.png");

          await interaction.editReply({ components: [] });
          await interaction.followUp({ embeds: [successEmbed] });

          collector.stop("success");
        } catch (err) {
          console.error("Error adding to wantlist:", err);
          await interaction.followUp({ content: "❌ Error: Could not add to wantlist.", ephemeral: true });
        }
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "success") return;
      sentMessage
        .edit({
          components: [buildRow({ disabled: true })],
        })
        .catch(() => {});
    });
  } catch (err) {
    console.error("ProcessCheckExists Error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await reply.edit(`❌ **Error:** ${errorMsg}`).catch(() => {});
  }
};
