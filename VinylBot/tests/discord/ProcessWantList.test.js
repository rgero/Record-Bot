import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessWantList } from "../../src/discord/ProcessWantlist.js";
import { escapeColons } from "../../src/utils/escapeColons.js";
import { getWantList } from "../../src/google/GetWantList.js";
import { isInList } from "../../src/utils/userParser.js";

vi.mock("discord.js", () => {
  return {
    ComponentType: { Button: 2 },
    ButtonStyle: { Primary: 1 },

    ActionRowBuilder: class {
      constructor() {
        this.components = [];
      }
      addComponents(...components) {
        this.components.push(...components);
        return this;
      }
      setComponents(components) {
        this.components = components;
        return this;
      }
    },

    ButtonBuilder: class {
      constructor() {
        this.data = {};
      }
      setCustomId(id) {
        this.data.custom_id = id;
        return this;
      }
      setLabel(label) {
        this.data.label = label;
        return this;
      }
      setStyle(style) {
        this.data.style = style;
        return this;
      }
      setDisabled(disabled) {
        this.data.disabled = disabled;
        return this;
      }
    },

    EmbedBuilder: class {
      constructor() {
        this.data = {};
      }
      setTitle(title) {
        this.data.title = title;
        return this;
      }
      setDescription(description) {
        this.data.description = description;
        return this;
      }
      setColor(color) {
        this.data.color = color;
        return this;
      }
    },
  };
});

vi.mock("../../src/google/GetWantList.js", () => ({
  getWantList: vi.fn(),
}));

vi.mock("../../src/utils/escapeColons.js", () => ({
  escapeColons: vi.fn(),
}));

vi.mock("../../src/utils/userParser.js", () => ({
  isInList: vi.fn(),
}));

const createMessage = (content = "!wantlist") => {
  const collectors = {};

  return {
    content,
    author: { id: "user123" },
    reply: vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn(({ time }) => {
        collectors.collector = {
          on: vi.fn((event, cb) => {
            collectors[event] = cb;
          }),
        };
        return collectors.collector;
      }),
      edit: vi.fn().mockResolvedValue(undefined)
    }),
    __collectors: collectors,
  };
};

const sampleList = Array.from({ length: 12 }, (_, i) => [
  `Artist:${i + 1}`,
  `Album:${i + 1}`,
]);

describe("ProcessWantList", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    escapeColons.mockImplementation((s) => s.replace(/:/g, "\\:"));
    isInList.mockReturnValue(false);
  });

  it("replies with error when want list is empty", async () => {
    getWantList.mockResolvedValue([]);

    const message = createMessage();

    await ProcessWantList(message);

    expect(message.reply).toHaveBeenCalledWith(
      "❌ There's nothing on the list."
    );
  });

  it("sends initial embed with pagination buttons", async () => {
    getWantList.mockResolvedValue(sampleList);

    const message = createMessage();

    await ProcessWantList(message);

    const replyPayload = message.reply.mock.calls[0][0];

    expect(replyPayload.embeds[0].data.color).toBe(0x1db954);
    expect(replyPayload.embeds[0].data.title).toContain("Page 1/2");
    expect(replyPayload.components[0].components).toHaveLength(2);
  });

  it("escapes colons in artist and album names", async () => {
    getWantList.mockResolvedValue(sampleList);

    const message = createMessage();

    await ProcessWantList(message);

    const embed = message.reply.mock.calls[0][0].embeds[0].data;

    expect(embed.description).toContain("Artist\\:1 - Album\\:1");
  });

  it("updates page when next button is clicked by author", async () => {
    getWantList.mockResolvedValue(sampleList);

    const message = createMessage();

    await ProcessWantList(message);

    const collectHandler = message.__collectors.collect;

    const interaction = {
      customId: "next",
      user: { id: "user123" },
      update: vi.fn(),
    };

    await collectHandler(interaction);

    expect(interaction.update).toHaveBeenCalled();
    const updatedEmbed = interaction.update.mock.calls[0][0].embeds[0].data;

    expect(updatedEmbed.title).toContain("Page 2/2");
  });

  it("blocks pagination from other users", async () => {
    getWantList.mockResolvedValue(sampleList);

    const message = createMessage();

    await ProcessWantList(message);

    const collectHandler = message.__collectors.collect;

    const interaction = {
      customId: "next",
      user: { id: "someone_else" },
      reply: vi.fn(),
    };

    await collectHandler(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "You can't control this pagination.",
      ephemeral: true,
    });
  });

  it("disables buttons when collector ends", async () => {
    getWantList.mockResolvedValue(sampleList);

    const message = createMessage();

    await ProcessWantList(message);

    const endHandler = message.__collectors.end;
    const sentMessage = await message.reply.mock.results[0].value;

    await endHandler();

    expect(sentMessage.edit).toHaveBeenCalled();
    const editedComponents = sentMessage.edit.mock.calls[0][0].components[0].components;

    expect(editedComponents.every((btn) => btn.data.disabled)).toBe(true);
  });
});
