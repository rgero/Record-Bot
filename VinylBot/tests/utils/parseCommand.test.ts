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
      mentions: [], 
      flags: [], 
      query: "" 
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

    // Discord message content usually contains the raw mention string <@123>
    const message = createMockMessage("!have <@123> Pink Floyd", mentions);
    const result = await parseCommand(message);

    expect(result?.mentions).toContain(mockDbId);
    expect(result?.query).toBe("Pink Floyd");
  });

  it('should extract flags and scrub them from the query', async () => {
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map());
    const message = createMockMessage("!have Dark Side --vinyl —cd");
    const result = await parseCommand(message);

    expect(result?.flags).toEqual(['vinyl', 'cd']);
    expect(result?.query).toBe("Dark Side");
  });

  it('should handle complex mixed inputs', async () => {
    const mentions = new Collection<string, any>();
    mentions.set('123', { username: 'Alice', bot: false });
    
    vi.mocked(dropdownUtils.getDropdownValue).mockReturnValue('alice');
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map().set('alice', ['uuid-123']));

    const message = createMockMessage("!stats <@123> --detailed Radiohead", mentions);
    const result = await parseCommand(message);

    expect(result).toEqual({
      mentions: ['uuid-123'],
      flags: ['detailed'],
      query: 'Radiohead'
    });
  });
});