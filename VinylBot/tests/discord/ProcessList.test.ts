import * as commandParser from '../../src/utils/parseCommand';
import * as vinylApi from '../../src/services/vinyls.api';
import * as wantlistApi from '../../src/services/wantlist.api';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Message } from 'discord.js';
import { ProcessList } from '../../src/discord/ProcessList';
import { SearchResponse } from '../../src/interfaces/SearchResponse';

vi.mock('../../src/services/vinyls.api');
vi.mock('../../src/services/wantlist.api');
vi.mock('../../src/utils/parseCommand');

describe('ProcessList Integration Tests', () => {
  
  const createMockMessage = (content: string) => ({
    content,
    author: { id: 'author-id' },
    reply: vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn().mockReturnValue({ 
        on: vi.fn(),
        stop: vi.fn() 
      }),
      edit: vi.fn().mockResolvedValue({}),
    }),
  } as unknown as Message);

  const mockSearchItem = (artist: string, album: string): SearchResponse => ({
    artist,
    album,
    owners: [],
    searcher: []
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Want List (!wantlist)', () => {
    it('should fetch from wantlist.api using the context object', async () => {
      const mockMessage = createMockMessage('!wantlist Rise Against');
      const mockContext = {
        query: 'Rise Against',
        mentions: [],
        flags: {}
      };

      vi.mocked(commandParser.parseCommand).mockResolvedValue(mockContext);
      vi.mocked(wantlistApi.getWantList).mockResolvedValue([
        mockSearchItem('Rise Against', 'The Unraveling')
      ]);

      await ProcessList(mockMessage, 'want');

      expect(wantlistApi.getWantList).toHaveBeenCalledWith({term: 'Rise Against', type: 'search'});
      
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0][0] as any;
      expect(replyCall.embeds[0].data.title).toContain('Want List matches for "Rise Against"');
    });
  });

  describe('Edge Cases & Errors', () => {
    it('should reply with a warning if the query returns no results', async () => {
      const mockMessage = createMockMessage('!want NonExistentArtist');
      
      // Setup context to trigger the 'search' type in the switch default
      vi.mocked(commandParser.parseCommand).mockResolvedValue({ 
        query: 'NonExistentArtist', 
        mentions: [], 
        flags: {}
      });

      // We must mock getWantList because that's what the 'want' case calls
      vi.mocked(wantlistApi.getWantList).mockResolvedValue([]);

      await ProcessList(mockMessage, 'want');

      // EmbeddedResponse checks list.length and calls message.reply
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('❌ No items found'));
    });

    it('should handle API errors gracefully', async () => {
      const mockMessage = createMockMessage('!want error');
      // Prevent console.error from cluttering test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(commandParser.parseCommand).mockResolvedValue({ 
        query: 'fail', 
        mentions: [], 
        flags: {}
      });
      
      // Mock the actual function used in the 'default' switch case
      vi.mocked(wantlistApi.getWantList).mockRejectedValue(new Error('DB Error'));

      await ProcessList(mockMessage, 'want');

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('⚠️ An error occurred'));
      consoleSpy.mockRestore();
    });
  });
});