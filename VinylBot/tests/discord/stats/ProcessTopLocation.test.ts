import * as locationsApi from "../../../src/services/locations.api.js";
import * as usersApi from "../../../src/services/users.api.js";
import * as resolveUserMapModule from "../../../src/utils/resolveUserMap.js";

import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { CommandContext } from "../../../src/utils/parseCommand.js";
import { EmbeddedResponse } from "../../../src/utils/discord/EmbeddedResponse.js";
import { ProcessTopLocation } from '../../../src/discord/stats/ProcessTopLocation.js'
import { Message } from "discord.js";

vi.mock("../../../src/services/locations.api.js");
vi.mock("../../../src/services/users.api.js");
vi.mock("../../../src/utils/resolveUserMap.js");
vi.mock("../../../src/utils/discord/EmbeddedResponse.js");
vi.mock("../../../src/utils/discordToDropdown.js", () => ({
  getDropdownValue: (str: string) => str.toLowerCase(),
}));
vi.mock("../../../src/utils/escapeColons.js", () => ({
  escapeColons: (str: string) => str 
}));

const emptyContext = (): CommandContext => ({ mentions: [], flags: {}, query: '' });

describe('ProcessTopLocation', () => {
  let mockMessage: any;
  let consoleSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessage = { reply: vi.fn() };
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should fetch and display global top locations by default', async () => {
    const mockListData = [{ title: 'Record Store A', count: 10 }];
    vi.mocked(locationsApi.getLocationsByPurchaseCount).mockResolvedValue(mockListData);

    await ProcessTopLocation(mockMessage as Message, emptyContext());

    expect(locationsApi.getLocationsByPurchaseCount).toHaveBeenCalled();
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Locations by Album Count',
      list: mockListData
    }));
  });

  it('should fetch and display user-specific locations when a mention is present', async () => {
    const userId = 'user_99';
    const context: CommandContext = { mentions: [userId as any], flags: {}, query: '' };
    vi.mocked(usersApi.getNameById).mockResolvedValue('Alice');
    vi.mocked(locationsApi.getLocationsByPurchaseCountForID).mockResolvedValue([
      { title: 'Local Shop', count: 2 }
    ]);

    await ProcessTopLocation(mockMessage as Message, context);

    expect(locationsApi.getLocationsByPurchaseCountForID).toHaveBeenCalledWith(userId);
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Locations by Album Count for Alice',
    }));
  });

  it('should fetch and display user-specific locations when --mine is present', async () => {
    const context: CommandContext = { mentions: [], flags: { mine: true }, query: '' };
    mockMessage.author = { username: 'alice' };
    vi.mocked(resolveUserMapModule.resolveUserMap).mockResolvedValue(new Map([['alice', ['user_99']]]));
    vi.mocked(usersApi.getNameById).mockResolvedValue('Alice');
    vi.mocked(locationsApi.getLocationsByPurchaseCountForID).mockResolvedValue([
      { title: 'Local Shop', count: 2 }
    ]);

    await ProcessTopLocation(mockMessage as Message, context);

    expect(resolveUserMapModule.resolveUserMap).toHaveBeenCalled();
    expect(locationsApi.getLocationsByPurchaseCountForID).toHaveBeenCalledWith('user_99');
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Locations by Album Count for Alice',
    }));
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(locationsApi.getLocationsByPurchaseCount).mockRejectedValue(new Error('Database Down'));

    await ProcessTopLocation(mockMessage as Message, emptyContext());

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ An error occurred")
    );
  });
});
