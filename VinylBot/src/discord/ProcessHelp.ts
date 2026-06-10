import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message } from "discord.js";

export const ProcessHelp = async (message: Message) => {
  try {
    const collectionPage = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Vinyl Bot Commands (1/3)")
      .setDescription("Here is the list of available commands for Vinyl Bot:\n\n**Database & Collection**")
      .addFields(
        { name: "Add to Database", value: "`!add {spotify link}`: Adds the album to the database (finish details on the website)." },
        { 
          name: "Collection Management", 
          value: 
            "`!want {spotify link}`: Adds an album to the want list.\n" +
            "`!wantlist`: Gives you the whole want list.\n" +
            "`!wantlist {person}`: Gives you the want list of that person.\n" +
            "`!wantlist {search term}`: Gives you the want list items that match that term.\n" +
            "`!have`: Gives you the whole have list.\n" +
            "`!have {person}`: Gives you the have list of that person.\n" +
            "`!have {search term}`: Gives you the have list items that match that term."
        }
      );

    const playPage = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Vinyl Bot Commands (2/3)")
      .setDescription("**Tracking & Lookups**")
      .addFields(
        { 
          name: "Tracking Playback", 
          value: 
            "`!play {spotify link} {user}`: Adds a play for that album.\n" +
            "`!play {artist OR album} {user}`: Adds a play for that album. (If multiple results, gives a dropdown).\n" +
            "*Note: Include a user mention to log multiple listeners.*" 
        },
        {
          name: "Discogs Lookup",
          value:
            "`!exists --artist {name} --album {name}`: Checks Discogs for a vinyl pressing.\n" +
            "`!exists {spotify link}`: Same check using artist/album from Spotify.",
        }
      );

    const infoPage = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Vinyl Bot Commands (3/3)")
      .setDescription("**Discovery & Stats**")
      .addFields(
        {
          name: "Randomizer & Info",
          value:
            "`!random`: Chooses a random vinyl.\n" +
            "`!random {person}`: Chooses a random vinyl liked by that person.\n" +
            "`!random {term}`: Chooses a random vinyl based on that term.\n" +
            "`!random --store`: Chooses a random store.\n" +
            "`!random --tags {tags}`: Chooses a random vinyl based on tags.\n" +
            "`!random --unplayed`: Chooses a random vinyl from your unplayed list.\n" +
            "`!info {album name}`: Gives you some info about the album."
        },
        { 
          name: "Playlogs & Statistics", 
          value: 
            "`!playlogs`: Gives you the list of playlogs.\n" +
            "`!playlog {id}`: Gives you the details of that playlog entry.\n" +
            "`!stats {user|artist}`: Top albums by play count.\n" +
            "`!stats --albums` / `--artists`: Returns top albums or artists.\n" +
            "`!stats --plays {user|artist}`: Returns top albums by play count.\n" +
            "`!stats --locations`: Returns locations sorted by album count.\n" +
            "`!tag {array of tags}`: Lists albums with specified tags.\n" +
            "`!unplayed`: Returns a list of unplayed albums in your collection."
        }
      )
      .setTimestamp();

    const pages = [collectionPage, playPage, infoPage];
    let currentPage = 0;

    const createButtons = (pageIndex: number) => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀️ Back")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === 0), // Disable if on the first page
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === pages.length - 1) // Disable if on the last page
      );
    };

    const helpMessage = await message.reply({
      embeds: [pages[currentPage]],
      components: [createButtons(currentPage)],
    });

    const collector = helpMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000, 
    });

    collector.on("collect", async (interaction) => {
      // Security check: Only allow the person who ran the command to click buttons
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ 
          content: "❌ Run the `!help` command yourself to navigate the menu!", 
          ephemeral: true 
        });
        return;
      }

      // Handle pagination logic
      if (interaction.customId === "prev" && currentPage > 0) {
        currentPage--;
      } else if (interaction.customId === "next" && currentPage < pages.length - 1) {
        currentPage++;
      }

      // Update the original message with the new embed and adjusted button states
      await interaction.update({
        embeds: [pages[currentPage]],
        components: [createButtons(currentPage)],
      });
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("◀️ Back").setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId("next").setLabel("Next ▶️").setStyle(ButtonStyle.Primary).setDisabled(true)
      );

      // Try updating the message, ignore if the message was deleted by the user
      await helpMessage.edit({ components: [disabledRow] }).catch(() => null);
    });

  } catch (error) {
    console.error("Error in ProcessHelp:", error);
    await message.reply("⚠️ An error occurred while fetching the help menu.");
  }
};