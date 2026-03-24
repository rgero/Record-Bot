import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserById, getUserByName } from '../../../src/services/users.api'

import { ProcessRandomAlbum } from '../../../src/discord/random/ProcessRandomAlbum'; // Adjust path
import { Vinyl } from '../../../src/interfaces/Vinyl';
import { getVinyls } from '../../../src/services/vinyls.api';
import { parseCommand } from '../../../src/utils/parseCommand';

// Mock all external dependencies
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

    // Setup a fake collector
    mockCollector = {
      on: vi.fn(),
      stop: vi.fn(),
    };

    // Setup the mock message
    mockMessage = {
      author: { id: 'user123', username: 'testuser' },
      reply: vi.fn().mockResolvedValue({
        createMessageComponentCollector: vi.fn().mockReturnValue(mockCollector),
        edit: vi.fn().mockResolvedValue({}),
      }),
    };
  });

  it('should notify if no user profile is found', async () => {
    vi.mocked(parseCommand).mockResolvedValue({ type: 'user', term: 'unknown' });
    vi.mocked(getUserById).mockResolvedValue(null);

    await ProcessRandomAlbum(mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining("No matching user profile found")
    );
  });

  it('should notify if the collection is empty', async () => {
    vi.mocked(parseCommand).mockResolvedValue({ type: 'full', term: '' });
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([]);

    await ProcessRandomAlbum(mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining("The requested collection is empty")
    );
  });

  it('should successfully send a random album and set up a collector', async () => {
    const mockVinyls = [{ id: 'v1', artist: 'Artist A', album: 'Album A' }] as unknown as Vinyl[];
    vi.mocked(parseCommand).mockResolvedValue({ type: 'full', term: '' });
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue(mockVinyls);

    await ProcessRandomAlbum(mockMessage);

    // Verify initial reply with embed and buttons
    expect(mockMessage.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: '🎲 Random Pick' })],
      components: expect.any(Array)
    }));

    // Verify collector was created
    expect(mockCollector.on).toHaveBeenCalledWith('collect', expect.any(Function));
  });

    it('should successfully use escape colons.', async () => {
    const mockVinyls = [{ id: 'v1', artist: 'Artist A', album: 'Heaven :x: Hell' }] as unknown as Vinyl[];
    vi.mocked(parseCommand).mockResolvedValue({ type: 'full', term: '' });
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue(mockVinyls);

    await ProcessRandomAlbum(mockMessage);

    // Verify initial reply with embed and buttons
    expect(mockMessage.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: '🎲 Random Pick', description: expect.stringContaining('Heaven \\:x\\: Hell') })],
      components: expect.any(Array)
    }));

    // Verify collector was created
    expect(mockCollector.on).toHaveBeenCalledWith('collect', expect.any(Function));
  });

  it('should handle the cancel button interaction correctly', async () => {
    const mockVinyls = [{ id: 'v1', artist: 'Artist A', album: 'Album A' }] as unknown as Vinyl[];
    vi.mocked(parseCommand).mockResolvedValue({ type: 'full', term: '' });
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue(mockVinyls);

    await ProcessRandomAlbum(mockMessage);

    // Extract the 'collect' callback
    const collectCallback = mockCollector.on.mock.calls.find((call: string[]) => call[0] === 'collect')[1];

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