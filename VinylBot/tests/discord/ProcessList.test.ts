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

  describe('Have List (!have)', () => {
    it('should fetch from vinyls.api using the full context object', async () => {
      const mockMessage = createMockMessage('!have Beatles');
      const mockContext = {
        query: 'Beatles',
        mentions: [],
        flags: []
      };

      vi.mocked(commandParser.parseCommand).mockResolvedValue(mockContext);
      vi.mocked(vinylApi.getVinylsByQuery).mockResolvedValue([
        mockSearchItem('The Beatles', 'Abbey Road')
      ]);

      await ProcessList(mockMessage, 'have');

      // Assert that we now pass the whole context to the API
      expect(vinylApi.getVinylsByQuery).toHaveBeenCalledWith({term: 'Beatles', type: 'search'});
      
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0][0] as any;
      expect(replyCall.embeds[0].data.title).toContain('Collection matches for "Beatles"');
    });

    it('should properly handle user mentions in the context', async () => {
      const mockMessage = createMockMessage('!have @Alice');
      const mockContext = {
        mentions: ['uuid-1234' as any],
        query: "",
        flags: []
      };

      vi.mocked(commandParser.parseCommand).mockResolvedValue(mockContext);
      vi.mocked(vinylApi.getVinylsByQuery).mockResolvedValue([
        mockSearchItem('Artist', 'Title')
      ]);

      await ProcessList(mockMessage, 'have');

      expect(vinylApi.getVinylsByQuery).toHaveBeenCalledWith({term: "uuid-1234", type: "user"});
    });
  });

  describe('Want List (!wantlist)', () => {
    it('should fetch from wantlist.api using the context object', async () => {
      const mockMessage = createMockMessage('!wantlist Rise Against');
      const mockContext = {
        query: 'Rise Against',
        mentions: [],
        flags: []
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
      const mockMessage = createMockMessage('!have NonExistentArtist');
      vi.mocked(commandParser.parseCommand).mockResolvedValue({ 
        query: 'NonExistentArtist', 
        mentions: [], 
        flags: [] 
      });
      vi.mocked(vinylApi.getVinylsByQuery).mockResolvedValue([]);

      await ProcessList(mockMessage, 'have');

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('❌ No items found'));
    });

    it('should handle API errors gracefully', async () => {
      const mockMessage = createMockMessage('!have error');
      vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(commandParser.parseCommand).mockResolvedValue({ query: '', mentions: [], flags: [] });
      vi.mocked(vinylApi.getVinylsByQuery).mockRejectedValue(new Error('DB Error'));

      await ProcessList(mockMessage, 'have');

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('⚠️ An error occurred'));
    });
  });
});