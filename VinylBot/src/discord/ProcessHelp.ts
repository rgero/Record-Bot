import { EmbedBuilder, Message } from "discord.js";

export const ProcessHelp = async (message: Message) => {
  try {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Vinyl Bot Commands")
      .setDescription("Here is the list of available commands for Vinyl Bot:")
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
        },
        { 
          name: "Tracking Playback", 
          value: 
            "`!play {spotify link} {user}`: Adds a play for that album.\n" +
            "`!play {artist OR album} {user}`: Adds a play for that album. If there is more than one result, it will give you the drop down.\n" +
            "The user mention is to include multiple listeners" 
        },
        { 
          name: "Discovery & Stats", 
          value: 
            "`!random`: Chooses a random vinyl.\n" +
            "`!random {person}`: Chooses a random vinyl liked by that person.\n" +
            "`!random {term}`: Chooses a random vinyl based on that term.\n" +
            "`!random --store`: Chooses a random store.\n" +
            "`!random --tag {tags}`: Chooses a random vinyl based on the specified tags.\n" +
            "`!random --unplayed`: Chooses a random vinyl from your unplayed list.\n" +
            "`!info {album name}`: Gives you some info about the album.\n" +
            "`!tag {array of tags}`: Gives you a list of albums with the specified tags.\n" +
            "`!top {user}`: Returns top artists by album count (household if no user specified).\n" +
            "`!top --plays {user|artist}`: Returns top albums by play count.\n" +
            "`!top --locations`: Returns the locations sorted by album count." + 
            "`!unplayed`: Returns a list of unplayed albums in your collection."
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [helpEmbed] });
  } catch (error) {
    console.error("Error in ProcessHelp:", error);
    await message.reply("⚠️ An error occurred while fetching the help menu.");
  }
};