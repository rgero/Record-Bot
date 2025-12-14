import "dotenv/config";

import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";

import { parseSpotifyUrl } from "./parseSpotifyUrl.js";
import { spotifyGet } from "./spotify.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Detect Spotify URL automatically
  const parsed = parseSpotifyUrl(message.content);
  if (!parsed) return; // Not a Spotify URL

  try {
    const data = await spotifyGet(`${parsed.type}s/${parsed.id}`);

    const embed = new EmbedBuilder()
      .setTitle(data.name)
      .setDescription(
        data.artists ? data.artists.map((a) => a.name).join(", ") : ""
      )
      .setColor(0x1db954) // Spotify green
      .setThumbnail(data.images?.[0]?.url)
      .addFields(
        { name: "Release Date", value: data.release_date || "N/A", inline: true },
        { name: "Tracks", value: `${data.total_tracks || "N/A"}`, inline: true }
      )
      .setURL(`https://open.spotify.com/${parsed.type}/${parsed.id}`);

    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    message.reply("❌ Failed to fetch Spotify data.");
  }
});

client.login(process.env.DISCORD_TOKEN);
