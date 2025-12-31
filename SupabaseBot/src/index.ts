import "dotenv/config";

import { Client, GatewayIntentBits, Message } from "discord.js";

import { ProcessList } from "./discord/ProcessList";
import { ProcessPlay } from "./discord/ProcessPlay";
import { ProcessRandomAlbum } from "./discord/ProcessRandomAlbum";
import { ProcessRandomStore } from "./discord/ProcessRandomStore";
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

  if (targetMessage.toLocaleLowerCase().startsWith("!2play "))
  {
    ProcessPlay(message);
    return;
  }

  if (targetMessage.startsWith("!2random")) {
    const args = message.content.split(" ").slice(1);
    const param = args[0]?.toLowerCase();
    if (param === "store")
    {
      ProcessRandomStore(message);
    } else {
      ProcessRandomAlbum(message);
    }
    return;
  }

  if(targetMessage.startsWith("!2wantlist"))
  {
    await ProcessList(message, 'want');
    return
  }

  if(targetMessage.startsWith("!2have"))
  {
    await ProcessList(message, 'have');
    return
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
