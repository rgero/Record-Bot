import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addPlayLogMock } = vi.hoisted(() => ({
  addPlayLogMock: vi.fn(),
}));

vi.mock('../../../../src/services/plays.api.js', () => ({
  addPlayLog: addPlayLogMock,
}));

import { attachRandomAlbumCollector, buildAlbumEmbed, buildAlbumRow, getRandomItem } from '../../../../src/discord/random/utils/randomAlbumUtils';

describe('randomAlbumUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects a random item from a list', () => {
    const list = [1, 2, 3];
    const selected = getRandomItem(list);

    expect(list).toContain(selected);
  });

  it('builds an album embed with title and fields', () => {
    const vinyl = { artist: 'Artist', album: 'Album', length: 42 } as any;
    const embed = buildAlbumEmbed(vinyl, 'Test Title');

    expect(embed.title).toBe('Test Title');
    expect(embed.fields).toEqual([
      expect.objectContaining({ name: 'Artist', value: 'Album' }),
      expect.objectContaining({ name: '⏱️ Length', value: '42 min' }),
    ]);
  });

  it('builds a row with play, reroll, and cancel buttons', () => {
    const row = buildAlbumRow({ showPlay: true });

    expect(row.components.length).toBe(3);
    expect(row.components.map((c: any) => c.data.custom_id)).toEqual(['play', 'reroll', 'cancel']);
  });

  it('builds a row without play button when showPlay is false', () => {
    const row = buildAlbumRow({ showPlay: false });
    expect(row.components.map((c: any) => c.data.custom_id)).toEqual(['reroll', 'cancel']);
  });

  it('rejects interactions from non-author users', async () => {
    const handlers: Record<string, any> = {};
    const collector = {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      }),
      stop: vi.fn(),
    };

    const sentMessage = {
      createMessageComponentCollector: vi.fn(() => collector),
      edit: vi.fn().mockResolvedValue(undefined),
    } as any;

    attachRandomAlbumCollector({
      sentMessage,
      message: { author: { id: 'owner' } } as any,
      getCurrentVinyl: () => ({ id: 1, artist: 'A', album: 'X' } as any),
      setCurrentVinyl: vi.fn(),
      vinyls: [{ id: 1, artist: 'A', album: 'X' } as any],
      title: 'Title',
      targetUser: { id: 'u1', name: 'user' } as any,
    });

    const interaction = {
      user: { id: 'other' },
      customId: 'play',
      reply: vi.fn().mockResolvedValue(undefined),
    } as any;

    await handlers.collect(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Only the person who rolled this can use the buttons.',
      ephemeral: true,
    });
  });

  it('logs play and sends success follow-up', async () => {
    const handlers: Record<string, any> = {};
    const collector = {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      }),
      stop: vi.fn(),
    };

    const sentMessage = {
      createMessageComponentCollector: vi.fn(() => collector),
      edit: vi.fn().mockResolvedValue(undefined),
    } as any;

    attachRandomAlbumCollector({
      sentMessage,
      message: { author: { id: 'owner' } } as any,
      getCurrentVinyl: () => ({ id: 11, artist: 'A', album: 'X' } as any),
      setCurrentVinyl: vi.fn(),
      vinyls: [{ id: 11, artist: 'A', album: 'X' } as any],
      title: 'Title',
      targetUser: { id: 'u1', name: 'Alice' } as any,
    });

    const interaction = {
      user: { id: 'owner' },
      customId: 'play',
      update: vi.fn().mockResolvedValue(undefined),
      followUp: vi.fn().mockResolvedValue(undefined),
    } as any;

    await handlers.collect(interaction);

    expect(collector.stop).toHaveBeenCalledWith('played');
    expect(addPlayLogMock).toHaveBeenCalled();
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Play logged for Alice') })
    );
  });

  it('warns when play is clicked for vinyl without id', async () => {
    const handlers: Record<string, any> = {};
    const collector = {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      }),
      stop: vi.fn(),
    };

    const sentMessage = {
      createMessageComponentCollector: vi.fn(() => collector),
      edit: vi.fn().mockResolvedValue(undefined),
    } as any;

    attachRandomAlbumCollector({
      sentMessage,
      message: { author: { id: 'owner' } } as any,
      getCurrentVinyl: () => ({ artist: 'A', album: 'X' } as any),
      setCurrentVinyl: vi.fn(),
      vinyls: [{ artist: 'A', album: 'X' } as any],
      title: 'Title',
      targetUser: { id: 'u1', name: 'Alice' } as any,
    });

    const interaction = {
      user: { id: 'owner' },
      customId: 'play',
      update: vi.fn().mockResolvedValue(undefined),
      followUp: vi.fn().mockResolvedValue(undefined),
    } as any;

    await handlers.collect(interaction);

    expect(interaction.followUp).toHaveBeenCalledWith({
      content: "⚠️ Album data missing, couldn't log play.",
    });
    expect(addPlayLogMock).not.toHaveBeenCalled();
  });

  it('rerolls to a different album and updates message', async () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.99);
    const handlers: Record<string, any> = {};
    const collector = {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      }),
      stop: vi.fn(),
    };

    const sentMessage = {
      createMessageComponentCollector: vi.fn(() => collector),
      edit: vi.fn().mockResolvedValue(undefined),
    } as any;

    const setCurrentVinyl = vi.fn();
    const vinyls = [
      { id: 1, artist: 'A', album: 'First' },
      { id: 2, artist: 'B', album: 'Second' },
    ] as any;

    attachRandomAlbumCollector({
      sentMessage,
      message: { author: { id: 'owner' } } as any,
      getCurrentVinyl: () => vinyls[0],
      setCurrentVinyl,
      vinyls,
      title: 'Title',
      targetUser: { id: 'u1', name: 'Alice' } as any,
    });

    const interaction = {
      user: { id: 'owner' },
      customId: 'reroll',
      update: vi.fn().mockResolvedValue(undefined),
    } as any;

    await handlers.collect(interaction);

    expect(setCurrentVinyl).toHaveBeenCalledWith(vinyls[1]);
    expect(interaction.update).toHaveBeenCalled();
    randSpy.mockRestore();
  });

  it('cancels collector and clears message components', async () => {
    const handlers: Record<string, any> = {};
    const collector = {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      }),
      stop: vi.fn(),
    };

    const sentMessage = {
      createMessageComponentCollector: vi.fn(() => collector),
      edit: vi.fn().mockResolvedValue(undefined),
    } as any;

    attachRandomAlbumCollector({
      sentMessage,
      message: { author: { id: 'owner' } } as any,
      getCurrentVinyl: () => ({ id: 1, artist: 'A', album: 'X' } as any),
      setCurrentVinyl: vi.fn(),
      vinyls: [{ id: 1, artist: 'A', album: 'X' } as any],
      title: 'Title',
      targetUser: { id: 'u1', name: 'Alice' } as any,
    });

    const interaction = {
      user: { id: 'owner' },
      customId: 'cancel',
      update: vi.fn().mockResolvedValue(undefined),
    } as any;

    await handlers.collect(interaction);

    expect(collector.stop).toHaveBeenCalledWith('cancelled');
    expect(interaction.update).toHaveBeenCalledWith({
      content: '🎲 Random pick cancelled.',
      embeds: [],
      components: [],
    });
  });

  it('disables buttons when collector ends from timeout', async () => {
    const handlers: Record<string, any> = {};
    const collector = {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      }),
      stop: vi.fn(),
    };

    const sentMessage = {
      createMessageComponentCollector: vi.fn(() => collector),
      edit: vi.fn().mockResolvedValue(undefined),
    } as any;

    attachRandomAlbumCollector({
      sentMessage,
      message: { author: { id: 'owner' } } as any,
      getCurrentVinyl: () => ({ id: 1, artist: 'A', album: 'X' } as any),
      setCurrentVinyl: vi.fn(),
      vinyls: [{ id: 1, artist: 'A', album: 'X' } as any],
      title: 'Title',
      targetUser: { id: 'u1', name: 'Alice' } as any,
    });

    handlers.end([], 'time');

    expect(sentMessage.edit).toHaveBeenCalled();
  });
});
