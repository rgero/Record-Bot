import "dotenv/config";

import { Client, GatewayIntentBits, Message } from "discord.js";

import { ProcessAdd } from "./discord/ProcessAdd.js";
import { ProcessCheckExists } from "./discord/ProcessCheckExists.js";
import { ProcessHave } from "./discord/ProcessHave.js";
import { ProcessHelp } from "./discord/ProcessHelp.js";
import { ProcessInfo } from "./discord/ProcessInfo.js";
import { ProcessList } from "./discord/ProcessList.js";
import { ProcessPlay } from "./discord/ProcessPlay.js";
import { ProcessPlaylog } from "./discord/ProcessPlaylog.js";
import { ProcessPlaylogs } from "./discord/ProcessPlaylogs.js";
import { ProcessRandomCommand } from "./discord/random/ProcessRandomCommand.js";
import { ProcessStatsCommand } from "./discord/stats/ProcessStatsCommand.js";
import { ProcessUnplayed } from "./discord/ProcessUnplayed.js";
import { ProcessWant } from "./discord/ProcessWant.js";

const client: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("error", (err) => {
  console.error("Discord client error:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args[0].toLowerCase();

  try {
    switch (command) {
      case "add":
        return await ProcessAdd(message);

      case "exists":
        return await ProcessCheckExists(message);

      case "have":
        return await ProcessHave(message);

      case "help":
        return await ProcessHelp(message);

      case "info":
        return await ProcessInfo(message);

      case "play":
        return await ProcessPlay(message);

      case "playlog":
        return await ProcessPlaylog(message);

      case "playlogs":
        return await ProcessPlaylogs(message);

      case "random":
        return await ProcessRandomCommand(message);

      case "stats":
        return await ProcessStatsCommand(message);

      case "tag":
        return await ProcessList(message, "tag");

      case "unplayed":
        return await ProcessUnplayed(message);

      case "want":
        return await ProcessWant(message);

      case "wantlist":
        return await ProcessList(message, "want");

      default:
        await message.reply(`Unknown command \`${command}\`. Try \`!help\` for a list of commands.`);
    }
  } catch (err) {
    console.error(`Error handling command "${command}":`, err);
    try {
      await message.reply("❌ Something went wrong while processing that command.");
    } catch {
      /* ignore reply failures */
    }
  }
});


// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
