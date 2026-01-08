import "dotenv/config";

import { Client, GatewayIntentBits, Message } from "discord.js";

import { ProcessList } from "./discord/ProcessList.js";
import { ProcessPlay } from "./discord/ProcessPlay.js";
import { ProcessRandomAlbum } from "./discord/ProcessRandomAlbum.js";
import { ProcessRandomStore } from "./discord/ProcessRandomStore.js";
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

  const targetMessage = message.content;
  if (targetMessage.toLocaleLowerCase().startsWith("!want "))
  {
    ProcessWant(message);
    return;
  }

  if (targetMessage.toLocaleLowerCase().startsWith("!2play "))
  {
    ProcessPlay(message);
    return;
  }

  if (targetMessage.startsWith("!random")) {
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

  if(targetMessage.startsWith("!wantlist"))
  {
    await ProcessList(message, 'want');
    return
  }

  if(targetMessage.startsWith("!have"))
  {
    await ProcessList(message, 'have');
    return
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
