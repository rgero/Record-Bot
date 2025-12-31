import "dotenv/config";

import { Client, GatewayIntentBits, Message } from "discord.js";

import { ProcessWant } from "./discord/ProcessWant";

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
  if (message.author.bot) return; // Ignore bot messages

  const targetMessage = message.content;
  if (targetMessage.toLocaleLowerCase().startsWith("!want2 "))
  {
    ProcessWant(message);
    return;
  }

  if (targetMessage.toLocaleLowerCase().startsWith("!play "))
  {
    // ProcessPlay(message);
    return;
  }

  if (targetMessage.startsWith("!random")) {
    // ProcessRandom(message);
    return;
  }

  if(targetMessage.startsWith("!wantlist"))
  {
    // await ProcessList(message, 'want');
    return
  }

  if(targetMessage.startsWith("!have"))
  {
    // await ProcessList(message, 'have');
    return
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
