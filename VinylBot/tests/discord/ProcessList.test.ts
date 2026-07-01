import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseCommandMock,
  getNameByIdMock,
  getVinylsByTagsMock,
  getWantListMock,
  EmbeddedResponseMock,
  sortItemsMock,
} = vi.hoisted(() => ({
  parseCommandMock: vi.fn(),
  getNameByIdMock: vi.fn(),
  getVinylsByTagsMock: vi.fn(),
  getWantListMock: vi.fn(),
  EmbeddedResponseMock: vi.fn(),
  sortItemsMock: vi.fn((items) => items),
}));

vi.mock('../../src/utils/parseCommand.js', () => ({
  parseCommand: parseCommandMock,
}));

vi.mock('../../src/services/users.api.js', () => ({
  getNameById: getNameByIdMock,
}));

vi.mock('../../src/services/vinyls.api.js', () => ({
  getVinylsByTags: getVinylsByTagsMock,
}));

vi.mock('../../src/services/wantlist.api.js', () => ({
  getWantList: getWantListMock,
}));

vi.mock('../../src/utils/discord/EmbeddedResponse.js', () => ({
  EmbeddedResponse: EmbeddedResponseMock,
}));

vi.mock('../../src/utils/sortItems.js', () => ({
  sortItems: sortItemsMock,
  validSorts: ['artist+', 'artist-'],
}));

import { ProcessList } from '../../src/discord/ProcessList';
describe('ProcessList Integration Tests', () => {
  const createMockMessage = (content = '') => ({
    content,
    author: { id: 'author-id' },
    reply: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    EmbeddedResponseMock.mockResolvedValue(undefined);
    sortItemsMock.mockImplementation((items: unknown[]) => items);
  });

  describe('Want List (!wantlist)', () => {
    it('should fetch from wantlist.api using the context object', async () => {
      const mockMessage = createMockMessage('!wantlist Rise Against');
      const mockContext = {
        query: 'Rise Against',
        mentions: [],
        flags: {}
      };

      parseCommandMock.mockResolvedValue({ ok: true, context: mockContext });
      getWantListMock.mockResolvedValue([{ artist: 'Rise Against', album: 'The Unraveling' }]);

      await ProcessList(mockMessage, 'want');

      expect(getWantListMock).toHaveBeenCalledWith({ term: 'Rise Against', type: 'search' });
      expect(EmbeddedResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Want List matches for "Rise Against"' })
      );
    });
  });

  describe('Edge Cases & Errors', () => {
    it('should reply with a warning if the query returns no results', async () => {
      const mockMessage = createMockMessage('!want NonExistentArtist');
      
      parseCommandMock.mockResolvedValue({
        ok: true,
        context: {
          query: 'NonExistentArtist',
          mentions: [],
          flags: {}
        }
      });

      getWantListMock.mockResolvedValue([]);

      await ProcessList(mockMessage, 'want');

      expect(EmbeddedResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({ list: [] })
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockMessage = createMockMessage('!want error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      parseCommandMock.mockResolvedValue({
        ok: true,
        context: {
          query: 'fail',
          mentions: [],
          flags: {}
        }
      });
      
      getWantListMock.mockRejectedValue(new Error('DB Error'));

      await ProcessList(mockMessage, 'want');

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('⚠️ An error occurred'));
      consoleSpy.mockRestore();
    });

    it('replies with parser error when parseCommand returns ok false with error', async () => {
      const message = createMockMessage() as any;
      parseCommandMock.mockResolvedValue({ ok: false, error: 'bad flag' });

      await ProcessList(message, 'want');

      expect(message.reply).toHaveBeenCalledWith('❌ bad flag');
      expect(EmbeddedResponseMock).not.toHaveBeenCalled();
    });

    it('returns silently when parseCommand returns ok false without error', async () => {
      const message = createMockMessage() as any;
      parseCommandMock.mockResolvedValue({ ok: false });

      await ProcessList(message, 'want');

      expect(message.reply).not.toHaveBeenCalled();
      expect(EmbeddedResponseMock).not.toHaveBeenCalled();
    });

    it('uses mention branch and user display name for want list title', async () => {
      const message = createMockMessage() as any;
      parseCommandMock.mockResolvedValue({
        ok: true,
        context: {
          mentions: ['u1'],
          flags: { sort: 'artist-' },
          query: '',
        },
      });
      getNameByIdMock.mockResolvedValue('Alice');
      getWantListMock.mockResolvedValue([{ artist: 'A', album: 'B' }]);

      await ProcessList(message, 'want');

      expect(getWantListMock).toHaveBeenCalledWith({ type: 'user', term: 'u1' });
      expect(sortItemsMock).toHaveBeenCalledWith([{ artist: 'A', album: 'B' }], 'artist-');
      expect(EmbeddedResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Want List matches for "Alice"' })
      );
    });

    it('falls back to Unknown User when mention cannot be resolved', async () => {
      const message = createMockMessage() as any;
      parseCommandMock.mockResolvedValue({
        ok: true,
        context: {
          mentions: ['u1'],
          flags: {},
          query: '',
        },
      });
      getNameByIdMock.mockResolvedValue(null);
      getWantListMock.mockResolvedValue([{ artist: 'A', album: 'B' }]);

      await ProcessList(message, 'want');

      expect(EmbeddedResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Want List matches for "Unknown User"' })
      );
    });

    it('uses query search branch for tag list and defaults sort on invalid sort flag', async () => {
      const message = createMockMessage() as any;
      parseCommandMock.mockResolvedValue({
        ok: true,
        context: {
          mentions: [],
          flags: { sort: 'not-valid' },
          query: 'punk,indie',
        },
      });
      getVinylsByTagsMock.mockResolvedValue([{ artist: 'A', album: 'B' }]);

      await ProcessList(message, 'tag');

      expect(getVinylsByTagsMock).toHaveBeenCalledWith(['punk', 'indie']);
      expect(sortItemsMock).toHaveBeenCalledWith([{ artist: 'A', album: 'B' }], 'artist+');
      expect(EmbeddedResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Collection matches for "punk,indie"' })
      );
    });

    it('uses full list title when no mention and no query', async () => {
      const message = createMockMessage() as any;
      parseCommandMock.mockResolvedValue({
        ok: true,
        context: {
          mentions: [],
          flags: {},
          query: '',
        },
      });
      getWantListMock.mockResolvedValue([{ artist: 'A', album: 'B' }]);

      await ProcessList(message, 'want');

      expect(getWantListMock).toHaveBeenCalledWith({ type: 'full', term: '' });
      expect(EmbeddedResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'The Want List' })
      );
    });

    it('replies with generic warning when processing throws', async () => {
      const message = createMockMessage() as any;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      parseCommandMock.mockRejectedValue(new Error('boom'));

      await ProcessList(message, 'want');

      expect(message.reply).toHaveBeenCalledWith('⚠️ An error occurred while fetching the list from the database.');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});