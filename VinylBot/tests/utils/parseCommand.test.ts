import * as userApi from '../../src/services/users.api';
import * as userParser from '../../src/utils/userParser';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseCommand } from '../../src/utils/parseCommand';

vi.mock('../../src/utils/userParser');
vi.mock('../../src/services/users.api');

describe('parseCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return type "full" when no arguments are provided', async () => {
    const result = await parseCommand("");
    expect(result).toEqual({ type: 'full', term: '' });
  });

  it('should return the user ID when a valid username is provided', async () => {
    vi.mocked(userParser.isInList).mockReturnValue(true);
    vi.mocked(userApi.getUserByName).mockResolvedValue({ id: 'uuid-1234', name: 'Alice' });

    const result = await parseCommand("Alice");

    expect(result).toEqual({ type: 'user', term: 'uuid-1234' });
    expect(userApi.getUserByName).toHaveBeenCalledWith("Alice");
  });

  it('should throw an error if the user exists in list but not in database', async () => {
    vi.mocked(userParser.isInList).mockReturnValue(true);
    vi.mocked(userApi.getUserByName).mockResolvedValue(null);

    await expect(parseCommand("FakeUser")).rejects.toThrow("Error parsing User");
  });

  it('should return type "search" for general queries', async () => {
    vi.mocked(userParser.isInList).mockReturnValue(false);
    
    const result = await parseCommand("In Rainbows");
    expect(result).toEqual({ type: 'search', term: 'In Rainbows' });
  });
});