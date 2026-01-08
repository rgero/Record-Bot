import * as commandParser from '../../src/utils/parseCommand';
import * as vinylApi from '../../src/services/vinyls.api';
import * as wantlistApi from '../../src/services/wantlist.api';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Message } from 'discord.js';
import { ProcessList } from '../../src/discord/ProcessList';

// Setup Mocks
vi.mock('../../src/services/vinyls.api');
vi.mock('../../src/services/wantlist.api');
vi.mock('../../src/utils/parseCommand');

describe('ProcessList Integration Tests', () => {
  
  // Helper to create the complex Discord Message mock
  const createMockMessage = (content: string) => ({
    content,
    author: { id: 'author-id' },
    reply: vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn().mockReturnValue({ 
        on: vi.fn(),
        stop: vi.fn() 
      }),
      edit: vi.fn(),
    }),
  } as unknown as Message);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- HAVE FUNCTIONALITY SUITE ---
  describe('Have List (!have)', () => {
    it('should fetch from vinyls.api and use green embed color', async () => {
      const mockMessage = createMockMessage('!have Beatles');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({
        type: 'search',
        term: 'Beatles'
      });

      const vinylSpy = vi.mocked(vinylApi.getVinylsByQuery).mockResolvedValue([
        ['The Beatles', 'Abbey Road']
      ]);

      await ProcessList(mockMessage, 'have');

      // Verify correct API was called
      expect(vinylSpy).toHaveBeenCalledWith({ type: 'search', term: 'Beatles' });
      
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0][0] as any;
      expect(replyCall.embeds[0].data.title).toContain('Collection matches for "Beatles"');
      expect(replyCall.embeds[0].data.color).toBe(0x1db954); // Green
    });

    it('should pass the resolved user ID to vinyls.api when searching by user', async () => {
      const mockMessage = createMockMessage('!have @Alice');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({
        type: 'user',
        term: 'uuid-1234'
      });

      const vinylSpy = vi.mocked(vinylApi.getVinylsByQuery).mockResolvedValue([['Artist', 'Title']]);

      await ProcessList(mockMessage, 'have');

      expect(vinylSpy).toHaveBeenCalledWith({ type: 'user', term: 'uuid-1234' });
    });
  });

  // --- WANT FUNCTIONALITY SUITE ---
  describe('Want List (!wantlist)', () => {
    it('should fetch from wantlist.api and use blue embed color', async () => {
      const mockMessage = createMockMessage('!wantlist Rise Against');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({
        type: 'search',
        term: 'Rise Against'
      });

      const wantSpy = vi.mocked(wantlistApi.getWantList).mockResolvedValue([
        ['Rise Against', 'Kid A']
      ]);

      await ProcessList(mockMessage, 'want');

      // Verify correct API was called
      expect(wantSpy).toHaveBeenCalledWith({ type: 'search', term: 'Rise Against' });
      
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0][0] as any;
      expect(replyCall.embeds[0].data.title).toContain('Want List matches for "Rise Against"');
      expect(replyCall.embeds[0].data.color).toBe(0x3498db); // Blue
    });

    it('should show "The Want List" title when fetching the full list', async () => {
      const mockMessage = createMockMessage('!wantlist');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({
        type: 'full',
        term: ''
      });

      vi.mocked(wantlistApi.getWantList).mockResolvedValue([{artist: 'Linkin Park', album:'Hybrid Theory'}]);

      await ProcessList(mockMessage, 'want');

      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0][0] as any;
      expect(replyCall.embeds[0].data.title).toContain('The Want List (Page 1/1)');
    });
  });

  // --- ERROR HANDLING ---
  describe('Edge Cases & Errors', () => {
    it('should reply with a specific message when the database returns no results', async () => {
      const mockMessage = createMockMessage('!have NonExistentArtist');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({ type: 'search', term: 'NonExistentArtist' });
      vi.mocked(vinylApi.getVinylsByQuery).mockResolvedValue([]);

      await ProcessList(mockMessage, 'have');

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('❌ Nothing found'));
    });
  });
});