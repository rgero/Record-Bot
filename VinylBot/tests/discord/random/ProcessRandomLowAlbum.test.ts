import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcessRandomLowAlbum } from '../../../src/discord/random/ProcessRandomLowAlbum';
import { getUserByName } from '../../../src/services/users.api';
import { getVinyls } from '../../../src/services/vinyls.api';

vi.mock('../../../src/services/users.api');
vi.mock('../../../src/services/vinyls.api');
vi.mock('../../../src/utils/discordToDropdown', () => ({
  getDropdownValue: vi.fn((name) => name),
}));

describe('ProcessRandomLowAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMessage = () => ({
    author: { id: 'user123', username: 'testuser' },
    reply: vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn().mockReturnValue({ on: vi.fn(), stop: vi.fn() }),
    }),
  } as any);

  it('rejects multiple mentions', async () => {
    const context = { mentions: ['one', 'two'], flags: {}, query: '' } as any;
    const message = createMessage();

    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith('❌ Can only have 1 mention');
  });

  it('replies when no matching vinyls are found', async () => {
    const context = { mentions: [], flags: {}, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([]);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith('❌ The requested collection is empty.');
  });

  it('uses --limit to filter low-play results', async () => {
    const context = { mentions: [], flags: { limit: '1' }, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([
      { id: 'v1', artist: 'A', album: 'One', playCount: 0 },
      { id: 'v2', artist: 'B', album: 'Two', playCount: 2 },
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: expect.stringContaining('<= 1 plays') })],
    }));
  });

  it('builds a low-play embed when results exist', async () => {
    const context = { mentions: [], flags: {}, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([
      { id: 'v1', artist: 'A', album: 'One', playCount: 0 },
      { id: 'v2', artist: 'B', album: 'Two', playCount: 0 },
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: expect.stringContaining('🎲 Random Low-Play Pick') })],
    }));
  });
});
