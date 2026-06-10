import * as playsApi from "../../../src/services/plays.api.js";
import * as resolveUserMapModule from "../../../src/utils/resolveUserMap.js";

import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { CommandContext } from "../../../src/utils/parseCommand.js";
import { EmbeddedResponse } from "../../../src/utils/discord/EmbeddedResponse.js";
import { ProcessTopArtists } from '../../../src/discord/stats/ProcessTopArtists.js'
import { Message } from "discord.js";

vi.mock("../../../src/services/plays.api.js");
vi.mock("../../../src/utils/resolveUserMap.js");
vi.mock("../../../src/utils/discord/EmbeddedResponse.js");
vi.mock("../../../src/utils/discordToDropdown.js", () => ({
  getDropdownValue: (str: string) => str.toLowerCase(),
}));
vi.mock("../../../src/utils/escapeColons.js", () => ({
  escapeColons: (str: string) => str 
}));

const emptyContext = (): CommandContext => ({ mentions: [], flags: {}, query: '' });

describe('ProcessTopArtists', () => {
  let mockMessage: any;
  let consoleSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessage = { reply: vi.fn() };
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should fetch and display global top artists by default', async () => {
    const mockListData = [{ title: 'Artist A', count: 10 }];
    vi.mocked(playsApi.getTopArtistsByPlay).mockResolvedValue(mockListData);

    await ProcessTopArtists(mockMessage as Message, emptyContext());

    expect(playsApi.getTopArtistsByPlay).toHaveBeenCalledWith();
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Artists by Play Count',
      list: mockListData
    }));
  });

  it('should fetch and display user-specific artists when a mention is present', async () => {
    const userId = 'user_99';
    const context: CommandContext = { mentions: [userId as any], flags: {}, query: '' };
    vi.mocked(playsApi.getTopArtistsByPlay).mockResolvedValue([{ title: 'Artist B', count: 5 }]);

    await ProcessTopArtists(mockMessage as Message, context);

    expect(playsApi.getTopArtistsByPlay).toHaveBeenCalledWith(userId);
  });

  it('should fetch and display user-specific artists when --mine is present', async () => {
    const context: CommandContext = { mentions: [], flags: { mine: true }, query: '' };
    mockMessage.author = { username: 'alice' };
    vi.mocked(resolveUserMapModule.resolveUserMap).mockResolvedValue(new Map([['alice', ['user_99']]]));
    vi.mocked(playsApi.getTopArtistsByPlay).mockResolvedValue([{ title: 'Artist B', count: 5 }]);

    await ProcessTopArtists(mockMessage as Message, context);

    expect(resolveUserMapModule.resolveUserMap).toHaveBeenCalled();
    expect(playsApi.getTopArtistsByPlay).toHaveBeenCalledWith('user_99');
  });

  it('should report a registration error for --mine when the user is unknown', async () => {
    const context: CommandContext = { mentions: [], flags: { mine: true }, query: '' };
    mockMessage.author = { username: 'unknown' };
    vi.mocked(resolveUserMapModule.resolveUserMap).mockResolvedValue(new Map());

    await ProcessTopArtists(mockMessage as Message, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining('⚠️ You are not registered or your Discord username could not be mapped to a user.')
    );
  });
});
