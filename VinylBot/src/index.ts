import "dotenv/config";

import { Client, GatewayIntentBits, Message } from "discord.js";

import { ProcessAdd } from "./discord/ProcessAdd.js";
import { ProcessCheckExists } from "./discord/ProcessCheckExists.js";
import { ProcessHelp } from "./discord/ProcessHelp.js";
import { ProcessInfo } from "./discord/ProcessInfo.js";
import { ProcessList } from "./discord/ProcessList.js";
import { ProcessPlay } from "./discord/ProcessPlay.js";
import { ProcessRandomAlbum } from "./discord/random/ProcessRandomAlbum.js";
import { ProcessRandomStore } from "./discord/random/ProcessRandomStore.js";
import { ProcessTopCommand } from "./discord/stats/ProcessTopCommand.js";
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

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args[0].toLowerCase();

  switch (command) {
    case "add":
      return await ProcessAdd(message);
      
    case "exists":
      return await ProcessCheckExists(message);
  
    case "have":
      return await ProcessList(message, "have");

    case "help":
      return await ProcessHelp(message);

    case "info":
      return await ProcessInfo(message);

    case "play":
      return await ProcessPlay(message);

    case "random":
      switch (args[1]?.toLowerCase()) {
        case "store":
          return await ProcessRandomStore(message);
        default:
          return await ProcessRandomAlbum(message);
      }

    case "top":
      return await ProcessTopCommand(message);

    case "unplayed":
      return await ProcessUnplayed(message);

    case "want":
      return await ProcessWant(message);

    case "wantlist":
      return await ProcessList(message, "want");
  }
});


// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
