import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message, MessageActionRowComponentBuilder} from "discord.js";

import { CheckAlbumExistence } from "#discogs/CheckAlbumExistence.js";
import { DiscogResponse } from "#interfaces/DiscogResponse.js";
import { SpotifyUrl } from "#interfaces/spotify/SpotifyUrl.js";
import { addWantedItem } from "#services/wantlist.api.js";
import { escapeColons } from "#utils/escapeColons.js";
import { getDropdownValue } from "#utils/discordToDropdown.js";
import { getSpotifyData } from "#spotify/getSpotifyData.js";
import { getUserByName } from "#services/users.api.js";
import { parseSpotifyUrl } from "#spotify/parseSpotifyUrl.js";

/**
 * Builds the action row containing the "Want" button.
 */
const buildRow = ({ disabled = false }: { disabled?: boolean }) => {
  const button = new ButtonBuilder()
    .setCustomId("add_to_want")
    .setLabel("👍 Want")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled);

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button);
};

export const ProcessCheckExists = async (message: Message) => {
  const args = message.content.split(/\s+/).slice(1);

  if (args.length === 0) {
    return message.reply("❌ Please provide a Spotify link or use the format: `Artist | Album`.");
  }

  const reply = await message.reply("🔍 Checking album existence...");

  try {
    let response: DiscogResponse | null = null;
    let albumName = "";
    let artists = "";

    // Case 1: Spotify URL provided
    const spotifyURL: SpotifyUrl | null = parseSpotifyUrl(args[0]);
    
    if (spotifyURL) {
      // Suppress embeds from the original link to keep chat clean
      await message.suppressEmbeds(true).catch(() => {}); 

      const spotifyData = await getSpotifyData(spotifyURL);
      ({ artists, albumName } = spotifyData);
      response = await CheckAlbumExistence(artists, albumName);
    } else {
      // Case 2: Artist | Album provided
      const queryString = args.join(" ");
      const parts = queryString.split("|").map(part => part.trim());

      if (parts.length < 2) {
        return reply.edit(
          "❌ Format error. Please use `Artist | Album` or provide a valid Spotify link."
        );
      }

      [artists, albumName] = parts;
      response = await CheckAlbumExistence(artists, albumName);
    }

    if (!response) {
      return reply.edit("❌ Error: Discogs returned no data. Check your spelling or try the website.");
    }

    const resultEmbed = new EmbedBuilder()
      .setTitle(`Result: ${escapeColons(response.title)}`)
      .setColor(response.exists ? 0x2ecc71 : 0xe74c3c) // Green for exists, Red for missing
      .setThumbnail(response.cover ?? "https://records.roymond.net/placeholder-album.png")
      .addFields({
        name: "Discogs Status",
        value: response.exists ? "✅ Found" : "❌ Not Found",
        inline: true,
      });

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
          const userRecord = await getUserByName(getDropdownValue(message.author.username));

          if (!userRecord) {
            return interaction.followUp({ content: "⚠️ User not found in system.", ephemeral: true });
          }

          const status = await addWantedItem({
            artist: artists, 
            album: albumName,
            imageUrl: response!.cover, 
            searcher: [userRecord.id]
          });

          const isDuplicate = status === "DUPLICATE";
          if (status === "ERROR") {
             return interaction.followUp({ content: "❌ System error: Could not save to database.", ephemeral: true });
          }

          const successEmbed = new EmbedBuilder()
            .setTitle(isDuplicate ? `⚠️ Already Listed` : `✅ Added to Wantlist`)
            .setDescription(`**${escapeColons(artists)}** - ${escapeColons(albumName)}`)
            .setColor(isDuplicate ? 0xf1c40f : 0x1db954)
            .setThumbnail(response!.cover ?? "https://records.roymond.net/placeholder-album.png");

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
      sentMessage.edit({
        components: [buildRow({ disabled: true })],
      }).catch(() => {});
    });

  } catch (err) {
    console.error("ProcessCheckExists Error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await reply.edit(`❌ **Critical Error:** ${errorMsg}`).catch(() => {});
  }
};