import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getArtistVinylCountByUserId, getArtistVinylCounts } from '../../../src/services/vinyls.api.js';

import { CommandContext } from '../../../src/utils/parseCommand.js';
import { EmbeddedResponse } from '../../../src/utils/discord/EmbeddedResponse.js';
import { ProcessTop } from '../../../src/discord/stats/ProcessTop.js';
import { getNameById } from '../../../src/services/users.api.js';

vi.mock('../../../src/services/users.api.js');
vi.mock('../../../src/services/vinyls.api.js');
vi.mock('../../../src/utils/discord/EmbeddedResponse.js');

const emptyContext = (): CommandContext => ({ mentions: [], flags: {}, query: '' });

describe('ProcessTop', () => {
  let mockMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockMessage = {
      reply: vi.fn(),
      channel: { send: vi.fn() },
    };
  });

  it('should reject search queries without invoking the list API', async () => {
    await ProcessTop(mockMessage, { ...emptyContext(), query: 'Radiohead' });

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Invalid usage'));
    expect(EmbeddedResponse).not.toHaveBeenCalled();
  });

  it('should fetch and display top artists for a specific user when mentions are present', async () => {
    const context: CommandContext = {
      mentions: ['123' as any],
      flags: {},
      query: ''
    };
    vi.mocked(getNameById).mockResolvedValue('JohnDoe');
    vi.mocked(getArtistVinylCountByUserId).mockResolvedValue([
      { title: 'Rise Against', count: 5 }
    ]);

    await ProcessTop(mockMessage, context);
    
    expect(getNameById).toHaveBeenCalledWith('123');
    expect(getArtistVinylCountByUserId).toHaveBeenCalledWith('123');

    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Artists by Album Count for JohnDoe',
      list: [{ title: 'Rise Against', count: 5 }]
    }));
  });

  it('should fetch and display global top artists when no mentions are present', async () => {
    vi.mocked(getArtistVinylCounts).mockResolvedValue([
      { title: 'Thrice', count: 10 }
    ]);

    await ProcessTop(mockMessage, emptyContext());

    expect(getArtistVinylCounts).toHaveBeenCalled();
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Artists by Album Count',
      list: [{ title: 'Thrice', count: 10 }]
    }));
  });

  it('should handle errors gracefully and reply with an error message', async () => {
    vi.mocked(getArtistVinylCounts).mockRejectedValue(new Error('DB Down'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await ProcessTop(mockMessage, emptyContext());

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('⚠️ An error occurred'));
    
    consoleSpy.mockRestore();
  });
});
