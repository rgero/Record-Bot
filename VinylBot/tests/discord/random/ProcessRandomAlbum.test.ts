import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserById, getUserByName } from '../../../src/services/users.api';

import { ProcessRandomAlbum } from '../../../src/discord/random/ProcessRandomAlbum';
import { Vinyl } from '../../../src/interfaces/Vinyl';
import { getVinyls } from '../../../src/services/vinyls.api';

vi.mock('../../../src/utils/parseCommand');
vi.mock('../../../src/services/users.api');
vi.mock('../../../src/services/vinyls.api');
vi.mock('../../../src/services/plays.api');
vi.mock('../../../src/utils/discordToDropdown', () => ({
  getDropdownValue: vi.fn((name) => name)
}));
// Mock escapeColons to return the string as-is for simpler testing
vi.mock('../../../src/utils/escapeColons', () => ({
  escapeColons: vi.fn((str) => str)
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
    };

    vi.mocked(getUserById).mockResolvedValue(null);

    await ProcessRandomAlbum(mockMessage, context as any);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      "❌ No matching user profile found for logging."
    );
  });

  it('should notify if the collection is empty', async () => {
    const context = { 
      mentions: [], 
      flags: [], 
      query: '' 
    };
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([]);

    await ProcessRandomAlbum(mockMessage, context as any);

    // Updated to match the actual string in the source code
    expect(mockMessage.reply).toHaveBeenCalledWith("❌ No entries found.");
  });

  it('should successfully send a random album and set up a collector', async () => {
    const mockVinyls = [{ id: 'v1', artist: 'Artist A', album: 'Album A', length: 45 }] as unknown as Vinyl[];
    const context = { 
      mentions: [], 
      flags: [], 
      query: '' 
    };
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue(mockVinyls);

    await ProcessRandomAlbum(mockMessage, context as any);

    // Using stringContaining because the code does .trim() on a string 
    // that might have trailing spaces depending on titleSuffix logic
    expect(mockMessage.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            title: expect.stringContaining('🎲 Random Pick')
          })
        })
      ]),
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
    };
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue(mockVinyls);

    await ProcessRandomAlbum(mockMessage, context as any);

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
      embeds: [],
      components: []
    }));
  });
});