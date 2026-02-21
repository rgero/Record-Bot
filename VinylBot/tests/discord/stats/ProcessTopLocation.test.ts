import * as locationsApi from "../../../src/services/locations.api.js";
import * as parseUtils from "../../../src/utils/parseCommand.js";
import * as usersApi from "../../../src/services/users.api.js";

import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { EmbeddedResponse } from "../../../src/utils/discord/EmbeddedResponse.js";
import { ProcessTopLocation } from '../../../src/discord/stats/ProcessTopLocation.js'
import { Message } from "discord.js";

vi.mock("../../../src/services/locations.api.js");
vi.mock("../../../src/services/users.api.js");
vi.mock("../../../src/utils/parseCommand.js");
vi.mock("../../../src/utils/discord/EmbeddedResponse.js");
vi.mock("../../../src/utils/escapeColons.js", () => ({
  escapeColons: (str: string) => str 
}));

describe('ProcessTopLocation', () => {
  let mockMessage: any;
  let consoleSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockMessage = {
      reply: vi.fn(),
    };
    
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should exit silently if command parsing fails', async () => {
    vi.mocked(parseUtils.parseCommand).mockResolvedValue(undefined);
    
    await ProcessTopLocation(mockMessage as Message);
    
    expect(EmbeddedResponse).not.toHaveBeenCalled();
  });

  it('should fetch and display global top locations by default', async () => {
    vi.mocked(parseUtils.parseCommand).mockResolvedValue({ type: 'search', term: '' });
    const mockListData = [{ title: 'Record Store A', count: 10 }];
    vi.mocked(locationsApi.getLocationsByPurchaseCount).mockResolvedValue(mockListData);

    await ProcessTopLocation(mockMessage as Message);

    expect(locationsApi.getLocationsByPurchaseCount).toHaveBeenCalled();
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Locations by Album Count',
      list: mockListData
    }));
  });

  it('should fetch and display user-specific locations when a user is targetted', async () => {
    const userId = 'user_99';
    vi.mocked(parseUtils.parseCommand).mockResolvedValue({ type: 'user', term: userId });
    vi.mocked(usersApi.getNameById).mockResolvedValue('Alice');
    vi.mocked(locationsApi.getLocationsByPurchaseCountForID).mockResolvedValue([
      { title: 'Local Shop', count: 2 }
    ]);

    await ProcessTopLocation(mockMessage as Message);

    expect(locationsApi.getLocationsByPurchaseCountForID).toHaveBeenCalledWith(userId);
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Locations by Album Count for Alice',
    }));
  });

  it('should properly format the list items via formatItem callback', async () => {
    vi.mocked(parseUtils.parseCommand).mockResolvedValue({ type: 'search', term: '' });
    vi.mocked(locationsApi.getLocationsByPurchaseCount).mockResolvedValue([{ title: 'Store: X', count: 5 }]);

    await ProcessTopLocation(mockMessage as Message);

    const calls = vi.mocked(EmbeddedResponse).mock.calls;
    const { formatItem } = calls[0][0];
    const result = formatItem({ title: 'Store: X', count: 5 }, 0);

    expect(result).toBe('1. **Store: X** - 5');
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(parseUtils.parseCommand).mockResolvedValue({ type: 'search', term: '' });
    vi.mocked(locationsApi.getLocationsByPurchaseCount).mockRejectedValue(new Error('Database Down'));

    await ProcessTopLocation(mockMessage as Message);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ An error occurred")
    );
    expect(consoleSpy).toHaveBeenCalled();
  });
});