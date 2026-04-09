import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getArtistVinylCountByUserId, getArtistVinylCounts } from '../../../src/services/vinyls.api.js';

import { EmbeddedResponse } from '../../../src/utils/discord/EmbeddedResponse.js';
import { ProcessTop } from '../../../src/discord/stats/ProcessTop.js';
import { getNameById } from '../../../src/services/users.api.js';
import { parseCommand } from '../../../src/utils/parseCommand.js';

vi.mock('../../../src/utils/parseCommand.js');
vi.mock('../../../src/services/users.api.js');
vi.mock('../../../src/services/vinyls.api.js');
vi.mock('../../../src/utils/discord/EmbeddedResponse.js');

describe('ProcessTop', () => {
  let mockMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockMessage = {
      reply: vi.fn(),
      channel: { send: vi.fn() },
    };
  });

  it('should return early if parseCommand returns undefined', async () => {
    vi.mocked(parseCommand).mockResolvedValue(undefined);

    await ProcessTop(mockMessage);

    expect(EmbeddedResponse).not.toHaveBeenCalled();
  });

  it('should fetch and display top artists for a specific user when mentions are present', async () => {
    // New structure: mentions array instead of type/term
    vi.mocked(parseCommand).mockResolvedValue({ 
      mentions: ['123' as any], 
      flags: [], 
      query: '' 
    });
    vi.mocked(getNameById).mockResolvedValue('JohnDoe');
    vi.mocked(getArtistVinylCountByUserId).mockResolvedValue([
      { title: 'Rise Against', count: 5 }
    ]);

    await ProcessTop(mockMessage);
    
    expect(getNameById).toHaveBeenCalledWith('123');
    expect(getArtistVinylCountByUserId).toHaveBeenCalledWith('123');

    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Artists by Album Count for JohnDoe',
      list: [{ title: 'Rise Against', count: 5 }]
    }));
  });

  it('should fetch and display global top artists when no mentions are present', async () => {
    vi.mocked(parseCommand).mockResolvedValue({ 
      mentions: [], 
      flags: [], 
      query: '' 
    });
    vi.mocked(getArtistVinylCounts).mockResolvedValue([
      { title: 'Thrice', count: 10 }
    ]);

    await ProcessTop(mockMessage);

    expect(getArtistVinylCounts).toHaveBeenCalled();
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Artists by Album Count',
      list: [{ title: 'Thrice', count: 10 }]
    }));
  });

  it('should handle errors gracefully and reply with an error message', async () => {
    vi.mocked(parseCommand).mockResolvedValue({ 
      mentions: [], 
      flags: [], 
      query: '' 
    });
    vi.mocked(getArtistVinylCounts).mockRejectedValue(new Error('DB Down'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await ProcessTop(mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('⚠️ An error occurred'));
    
    consoleSpy.mockRestore();
  });
});