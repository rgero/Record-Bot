import {ActionRowBuilder, ComponentType, StringSelectMenuBuilder} from "discord.js";

import { LogPlay } from "../google/LogPlay.js";
import { getData } from "../google/GetData.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getSpotifyData } from "../spotify/getSpotifyData.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";

export const ProcessPlay = async (message) => {
  const params = message.content.split(" ").slice(1).join(" ").trim();
  const requester = message.author?.username || "Unknown";
  const username = getDropdownValue(requester);

  const spotify = parseSpotifyUrl(params);
  if (spotify) {
    const { artists, albumName } = await getSpotifyData(spotify); 
    await LogPlay(artists, albumName, username);

    message.reply(`Logged a play for ${artists} - ${albumName}`)
    return;
  }

  let data = await getData();
  data = data.filter(row => {
    const isArtist = row[0] && row[0].toLowerCase().includes(params.toLowerCase());
    const isAlbum  = row[1] && row[1].toLowerCase().includes(params.toLowerCase());
    return isArtist || isAlbum;
  });

  if (data.length === 0) {
    await message.reply("No matching albums found!");
    return;
  }

  const albumLimit = 25;
  const options = data.slice(0, albumLimit).map((row, index) => ({
    label: `${row[0].slice(0, 40)} - ${row[1].slice(0, 40)}`, // Labels must be < 100 chars
    value: index.toString()
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("select_album")
    .setPlaceholder("Choose an album...")
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const replyMessage = await message.reply({
    content: "Please select the correct album from the dropdown:",
    components: [row],
  });

  const collector = replyMessage.createMessageComponentCollector({
    componentType: ComponentType.StringSelect, 
    max: 1,
    time: 60000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: "This isn't for you!", ephemeral: true });
      return;
    }
    
    await interaction.deferUpdate(); 

    const selectedIndex = parseInt(interaction.values[0]);
    const selectedRow = data[selectedIndex];

    // Since we used deferUpdate, we use editReply or followUp
    await interaction.followUp({
      content: `✅ Selected: **${selectedRow[0]} - ${selectedRow[1]}**`,
      ephemeral: false
    });

    await LogPlay(selectedRow[0], selectedRow[1], username);
    message.reply(`Logged a play for ${selectedRow[0]} - ${selectedRow[1]}`)

    const disabledRow = new ActionRowBuilder().addComponents(
      StringSelectMenuBuilder.from(selectMenu).setDisabled(true)
    );
    
    await replyMessage.edit({ components: [disabledRow] });
  });

  collector.on("end", (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      replyMessage.edit({ content: "Selection timed out.", components: [] }).catch(() => null);
    }
  });
};