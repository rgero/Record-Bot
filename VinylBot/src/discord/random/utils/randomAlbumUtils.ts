import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message, ButtonInteraction, MessageActionRowComponentBuilder } from "discord.js";
import { addPlayLog } from "../../../services/plays.api.js";
import { PlayLog } from "../../../interfaces/PlayLog.js";
import { User } from "../../../interfaces/User.js";
import { Vinyl } from "../../../interfaces/Vinyl.js";
import { escapeColons } from "../../../utils/escapeColons.js";

export const getRandomItem = <T>(list: T[]): T => {
  return list[Math.floor(Math.random() * list.length)];
};

export const buildAlbumEmbed = (currentVinyl: Vinyl, title: string) => ({
  title,
  color: 0x5865f2,
  fields: [
    {
      name: `${escapeColons(currentVinyl.artist)}`,
      value: `${escapeColons(currentVinyl.album)}`,
      inline: true,
    },
    ...(currentVinyl.length
      ? [{ name: "⏱️ Length", value: `${currentVinyl.length} min`, inline: false }]
      : []),
  ],
});

export const buildAlbumRow = ({ showPlay, disabled = false }: { showPlay: boolean; disabled?: boolean }) => {
  const buttons = [];

  if (showPlay) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId("play")
        .setLabel("▶️ Play")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId("reroll")
      .setLabel("🔁 Reroll")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );

  buttons.push(
    new ButtonBuilder()
      .setCustomId("cancel")
      .setLabel("❌ Cancel")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons);
};

export interface RandomAlbumCollectorOptions {
  sentMessage: Message;
  message: Message;
  getCurrentVinyl: () => Vinyl;
  setCurrentVinyl: (vinyl: Vinyl) => void;
  vinyls: Vinyl[];
  title: string;
  targetUser: User;
}

export const attachRandomAlbumCollector = ({
  sentMessage,
  message,
  getCurrentVinyl,
  setCurrentVinyl,
  vinyls,
  title,
  targetUser,
}: RandomAlbumCollectorOptions) => {
  const collector = sentMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (interaction: ButtonInteraction) => {
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({
        content: "Only the person who rolled this can use the buttons.",
        ephemeral: true,
      });
      return;
    }

    let currentVinyl = getCurrentVinyl();

    if (interaction.customId === "play") {
      collector.stop("played");
      await interaction.update({ components: [] });

      if (!currentVinyl?.id) {
        await interaction.followUp({ content: "⚠️ Album data missing, couldn't log play." });
        return;
      }

      const newPlay: PlayLog = {
        album_id: currentVinyl.id,
        listeners: [targetUser.id],
        date: new Date(),
      };

      try {
        await addPlayLog(newPlay);
        await interaction.followUp({
          content: `▶️ **Play logged for ${targetUser.name}:** ${currentVinyl.artist} — *${currentVinyl.album}*`,
        });
      } catch (playErr) {
        console.error("Failed to log play:", playErr);
        await interaction.followUp({ content: "⚠️ Failed to log play to database." });
      }
    }

    if (interaction.customId === "reroll") {
      if (vinyls.length > 1) {
        let nextVinyl;
        do {
          nextVinyl = getRandomItem(vinyls);
        } while (nextVinyl.album === currentVinyl.album);
        setCurrentVinyl(nextVinyl);
        currentVinyl = nextVinyl;
      }

      await interaction.update({
        embeds: [buildAlbumEmbed(currentVinyl, title)],
        components: [buildAlbumRow({ showPlay: true })],
      });
    }

    if (interaction.customId === "cancel") {
      collector.stop("cancelled");
      await interaction.update({
        content: "🎲 Random pick cancelled.",
        embeds: [],
        components: [],
      });
    }
  });

  collector.on("end", (_collected, reason) => {
    if (reason === "played" || reason === "cancelled") return;
    sentMessage
      .edit({
        components: [buildAlbumRow({ showPlay: true, disabled: true })],
      })
      .catch(() => {});
  });

  return collector;
};
