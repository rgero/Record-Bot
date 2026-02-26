import "dotenv/config";

import { Client, GatewayIntentBits, Message } from "discord.js";

import { ProcessAdd } from "./discord/ProcessAdd.js";
import { ProcessCheckExists } from "./discord/ProcessCheckExists.js";
import { ProcessHelp } from "./discord/ProcessHelp.js";
import { ProcessInfo } from "./discord/ProcessInfo.js";
import { ProcessList } from "./discord/ProcessList.js";
import { ProcessPlay } from "./discord/ProcessPlay.js";
import { ProcessPlayCount } from "./discord/stats/ProcessPlayCount.js";
import { ProcessRandomAlbum } from "./discord/random/ProcessRandomAlbum.js";
import { ProcessRandomStore } from "./discord/random/ProcessRandomStore.js";
import { ProcessTop } from "./discord/stats/ProcessTop.js";
import { ProcessTopLocation } from "./discord/stats/ProcessTopLocation.js";
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
    case "wantlist":
      return await ProcessList(message, "want");

    case "want":
      return await ProcessWant(message);

    case "have":
      return await ProcessList(message, "have");

    case "play":
      return await ProcessPlay(message);

    case "random":
      return args[1]?.toLowerCase() === "store"
        ? await ProcessRandomStore(message)
        : await ProcessRandomAlbum(message);

    case "add":
      return await ProcessAdd(message);

    case "top":
      switch (args[1]?.toLowerCase()) {
        case "plays":
          return await ProcessPlayCount(message);
        case "locations":
          return await ProcessTopLocation(message);
        default:
          return await ProcessTop(message);
      }

    case "info":
      return await ProcessInfo(message);

    case "exists":
      return await ProcessCheckExists(message);

    case "help":
      return await ProcessHelp(message);
  }
});


// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
