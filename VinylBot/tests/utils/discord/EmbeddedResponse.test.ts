import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmbeddedResponse } from '../../../src/utils/discord/EmbeddedResponse';

describe('EmbeddedResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replies with no-items message when list is empty', async () => {
    const message = {
      reply: vi.fn().mockResolvedValue(undefined),
    } as any;

    await EmbeddedResponse({
      message,
      title: 'Items',
      list: [],
      formatItem: (item) => String(item),
    });

    expect(message.reply).toHaveBeenCalledWith('❌ No items found.');
  });

  it('renders first page and handles unauthorized button use', async () => {
    const handlers: Record<string, any> = {};
    const collector = {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      }),
    };

    const sentMessage = {
      createMessageComponentCollector: vi.fn(() => collector),
      edit: vi.fn().mockResolvedValue(undefined),
    } as any;

    const message = {
      author: { id: 'owner' },
      reply: vi.fn().mockResolvedValue(sentMessage),
    } as any;

    await EmbeddedResponse({
      message,
      title: 'Items',
      list: ['a', 'b', 'c'],
      pageSize: 2,
      formatItem: (item, idx) => `${idx + 1}. ${item}`,
    });

    expect(message.reply).toHaveBeenCalled();

    const interaction = {
      user: { id: 'someone-else' },
      customId: 'next',
      reply: vi.fn().mockResolvedValue(undefined),
    } as any;

    await handlers.collect(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "You can't control this pagination.",
      ephemeral: true,
    });
  });

  it('moves between pages and disables controls on collector end', async () => {
    const handlers: Record<string, any> = {};
    const collector = {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      }),
    };

    const sentMessage = {
      createMessageComponentCollector: vi.fn(() => collector),
      edit: vi.fn().mockResolvedValue(undefined),
    } as any;

    const message = {
      author: { id: 'owner' },
      reply: vi.fn().mockResolvedValue(sentMessage),
    } as any;

    await EmbeddedResponse({
      message,
      title: 'Items',
      list: ['a', 'b', 'c'],
      pageSize: 2,
      formatItem: (item, idx) => `${idx + 1}. ${item}`,
      color: 12345,
    });

    const interaction = {
      user: { id: 'owner' },
      customId: 'next',
      update: vi.fn().mockResolvedValue(undefined),
    } as any;

    await handlers.collect(interaction);
    expect(interaction.update).toHaveBeenCalled();

    handlers.end();
    expect(sentMessage.edit).toHaveBeenCalled();
  });
});
