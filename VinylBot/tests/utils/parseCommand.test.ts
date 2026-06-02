import * as dropdownUtils from '../../src/utils/discordToDropdown';
import * as userMapService from '../../src/utils/resolveUserMap';

import { Collection, User } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseCommand } from '../../src/utils/parseCommand';

vi.mock('../../src/utils/resolveUserMap');
vi.mock('../../src/utils/discordToDropdown');

describe('parseCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockMessage = (content: string, mentions = new Collection()) => ({
    content,
    mentions: {
      users: mentions.filter(u => !(u as User).bot)
    }
  } as any);

  it('should return empty context when only command is provided', async () => {
    const message = createMockMessage("!have");
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map());
    
    const result = await parseCommand(message);
    
    expect(result).toEqual({ 
      ok: true,
      context: {
        mentions: [], 
        flags: {},
        query: "" 
      }
    });
  });

  it('should extract mentions and scrub them from the query', async () => {
    const mockDbId = 'db-uuid-123';
    const mockUser = { username: 'Alice', bot: false };
    const mentions = new Collection<string, any>();
    mentions.set('123', mockUser);
    
    vi.mocked(dropdownUtils.getDropdownValue).mockReturnValue('alice');
    const mockMap = new Map().set('alice', [mockDbId]);
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(mockMap);

    const message = createMockMessage("!have <@123> Pink Floyd", mentions);
    const result = await parseCommand(message);

    expect(result.ok && result.context.mentions).toContain(mockDbId);
    expect(result.ok && result.context.query).toBe("Pink Floyd");
  });

  it('should extract flags and scrub them from the query', async () => {
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map());
    const message = createMockMessage("!have Dark Side --vinyl —cd");
    const result = await parseCommand(message);

    expect(result).toEqual({
      ok: true,
      context: {
        mentions: [],
        flags: {
          vinyl: true,
          cd: true
        },
        query: "Dark Side"
      }
    });
  });

  it('should handle value-based flags', async () => {
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map());
    const message = createMockMessage("!have --sort artist+ Rise Against");
    const result = await parseCommand(message);

    expect(result).toEqual({
      ok: true,
      context: {
        mentions: [],
        flags: {
          sort: 'artist+'
        },
        query: "Rise Against"
      }
    });
  });

  it('should handle complex mixed inputs', async () => {
    const mentions = new Collection<string, any>();
    mentions.set('123', { username: 'Alice', bot: false });
    
    vi.mocked(dropdownUtils.getDropdownValue).mockReturnValue('alice');
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map().set('alice', ['uuid-123']));

    const message = createMockMessage("!stats <@123> --detailed Radiohead", mentions);
    const result = await parseCommand(message);

    expect(result).toEqual({
      ok: true,
      context: {
        mentions: ['uuid-123'],
        flags: { detailed: true },
        query: 'Radiohead'
      }
    });
  });

  it('should return an error when a value-flag is missing its argument', async () => {
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map());
    const message = createMockMessage("!have --sort");
    
    const result = await parseCommand(message);
    expect(result).toEqual({
      ok: false,
      error: 'The flag `--sort` requires an argument (e.g., `--sort value`).',
    });
  }); 

it('should convert em-dashes (—) into standard flag double dashes (--)', async () => {
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map());
    // Using an em-dash for a value-based flag
    const message = createMockMessage("!stats —count 10");
    
    const result = await parseCommand(message);
    
    expect(result).toEqual({
      ok: true,
      context: {
        mentions: [],
        flags: { count: '10' },
        query: ""
      }
    });
  });

  it('should return an error when a value-flag argument is another flag', async () => {
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map());
    const message = createMockMessage("!stats --count --dir asc");
    
    const result = await parseCommand(message);
    
    expect(result).toEqual({
      ok: false,
      error: 'The flag `--count` requires an argument (e.g., `--count value`).',
    });
  });

  it('should return an error when a value-flag argument is a discord mention', async () => {
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map());
    const message = createMockMessage("!stats --count <@123>");
    
    const result = await parseCommand(message);
    
    expect(result).toEqual({
      ok: false,
      error: 'The flag `--count` requires an argument (e.g., `--count value`).',
    });
  });

  it('should safely filter out text-based Discord mention strings from the query even if unmapped to a user', async () => {
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map());
    const message = createMockMessage("!stats <@!456789> Unknown Album");
    
    const result = await parseCommand(message);
    
    expect(result).toEqual({
      ok: true,
      context: {
        mentions: [],
        flags: {},
        query: "Unknown Album"
      }
    });
  });

  it('should return ok: false if the raw message content contains no flags', async () => {
    const message = createMockMessage("    ");
    const result = await parseCommand(message);
    expect(result).toEqual({ ok: false });
  });
});
