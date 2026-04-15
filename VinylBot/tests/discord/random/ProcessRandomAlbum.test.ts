import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserById, getUserByName } from '../../../src/services/users.api'

import { ProcessRandomAlbum } from '../../../src/discord/random/ProcessRandomAlbum';
import { Vinyl } from '../../../src/interfaces/Vinyl';
import { getVinyls } from '../../../src/services/vinyls.api';
import { parseCommand } from '../../../src/utils/parseCommand';

vi.mock('../../../src/utils/parseCommand');
vi.mock('../../../src/services/users.api');
vi.mock('../../../src/services/vinyls.api');
vi.mock('../../../src/services/plays.api');
vi.mock('../../../src/utils/discordToDropdown', () => ({
  getDropdownValue: vi.fn((name) => name)
}));

describe('ProcessRandomAlbum', () => {
  let mockMessage: any;
  let mockCollector: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCollector = {
      on: vi.fn(),
      stop: vi.fn(),
    };

    mockMessage = {
      author: { id: 'user123', username: 'testuser' },
      reply: vi.fn().mockResolvedValue({
        createMessageComponentCollector: vi.fn().mockReturnValue(mockCollector),
        edit: vi.fn().mockResolvedValue({}),
      }),
    };
  });

  it('should notify if no user profile is found via mention', async () => {
    const context = { 
      mentions: ['unknown-uuid' as any], 
      flags: [], 
      query: '' 
    }

    vi.mocked(getUserById).mockResolvedValue(null);

    await ProcessRandomAlbum(mockMessage, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining("No matching user profile found")
    );
  });

  it('should notify if the collection is empty', async () => {
    const context = { 
      mentions: [], 
      flags: [], 
      query: '' 
    }
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([]);

    await ProcessRandomAlbum(mockMessage, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining("The requested collection is empty")
    );
  });

  it('should successfully send a random album and set up a collector', async () => {
    const mockVinyls = [{ id: 'v1', artist: 'Artist A', album: 'Album A' }] as unknown as Vinyl[];
    const context = { 
      mentions: [], 
      flags: [], 
      query: '' 
    }
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue(mockVinyls);

    await ProcessRandomAlbum(mockMessage, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: '🎲 Random Pick' })],
      components: expect.any(Array)
    }));

    expect(mockCollector.on).toHaveBeenCalledWith('collect', expect.any(Function));
  });

  it('should handle the cancel button interaction correctly', async () => {
    const mockVinyls = [{ id: 'v1', artist: 'Artist A', album: 'Album A' }] as unknown as Vinyl[];
    const context = { 
      mentions: [], 
      flags: [], 
      query: '' 
    }
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue(mockVinyls);

    await ProcessRandomAlbum(mockMessage, context);

    const collectCallback = mockCollector.on.mock.calls.find((call: any[]) => call[0] === 'collect')[1];

    const mockInteraction = {
      user: { id: 'user123' },
      customId: 'cancel',
      update: vi.fn().mockResolvedValue({}),
    };

    await collectCallback(mockInteraction);

    expect(mockCollector.stop).toHaveBeenCalledWith('cancelled');
    expect(mockInteraction.update).toHaveBeenCalledWith(expect.objectContaining({
      content: "🎲 Random pick cancelled.",
    }));
  });
});