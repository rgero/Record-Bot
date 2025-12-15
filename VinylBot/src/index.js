import "dotenv/config";

import { Client, GatewayIntentBits } from "discord.js";

import { ProcessPlay } from "./discord/ProcessPlay.js";
import { ProcessRandom } from "./discord/ProcessRandom.js";
import { ProcessWant } from "./discord/ProcessWant.js";

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
  if (message.author.bot) return; // Ignore bot messages

  const targetMessage = message.content;
  if (targetMessage.toLocaleLowerCase().startsWith("!want "))
  {
    ProcessWant(message);
    return;
  }

  if (targetMessage.toLocaleLowerCase().startsWith("!play "))
  {
    ProcessPlay(message);
    return;
  }

  if (targetMessage.startsWith("!random")) {
    ProcessRandom(message);
    return;
  }

});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
