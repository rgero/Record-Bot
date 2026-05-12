import * as playsApi from "../../../src/services/plays.api.js";
import * as vinylsApi from "../../../src/services/vinyls.api.js";
import * as usersApi from "../../../src/services/users.api.js";

import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { CommandContext } from "../../../src/utils/parseCommand.js";
import { EmbeddedResponse } from "../../../src/utils/discord/EmbeddedResponse.js";
import { ProcessPlayCount } from '../../../src/discord/stats/ProcessPlayCount.js'
import { Message } from "discord.js";

vi.mock("../../../src/services/plays.api.js");
vi.mock("../../../src/services/vinyls.api.js");
vi.mock("../../../src/services/users.api.js");
vi.mock("../../../src/utils/discord/EmbeddedResponse.js");
vi.mock("../../../src/utils/escapeColons.js", () => ({
  escapeColons: (str: string) => str 
}));

const emptyContext = (): CommandContext => ({ mentions: [], flags: {}, query: '' });

describe('ProcessPlayCount', () => {
  let mockMessage: any;
  let consoleSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessage = {
      reply: vi.fn().mockResolvedValue({}),
    };
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should fetch top albums by user when mentions are present', async () => {
    const userId = '123';
    const context: CommandContext = { mentions: [userId as any], flags: {}, query: '' };
    vi.mocked(usersApi.getNameById).mockResolvedValue('JohnDoe');
    vi.mocked(playsApi.getTopPlayedAlbumsByUserID).mockResolvedValue([{ title: 'Album A', count: 10 }]);

    await ProcessPlayCount(mockMessage as Message, context);

    expect(vi.mocked(usersApi.getNameById)).toHaveBeenCalledWith(userId);
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Albums by Play Count for JohnDoe',
    }));
  });

  it('should fetch albums matching a search query', async () => {
    const context: CommandContext = { ...emptyContext(), query: 'Radiohead' };
    vi.mocked(playsApi.getSortedPlaysByQuery).mockResolvedValue([{ title: 'Kid A', count: 5 }]);

    await ProcessPlayCount(mockMessage as Message, context);

    expect(vi.mocked(playsApi.getSortedPlaysByQuery)).toHaveBeenCalledWith('Radiohead');
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Albums by Play Count matching "Radiohead"',
    }));
  });

  it('should pass the search query through to the plays API', async () => {
    const context: CommandContext = { ...emptyContext(), query: 'Pink Floyd' };
    vi.mocked(playsApi.getSortedPlaysByQuery).mockResolvedValue([{ title: 'The Wall', count: 20 }]);

    await ProcessPlayCount(mockMessage as Message, context);

    expect(vi.mocked(playsApi.getSortedPlaysByQuery)).toHaveBeenCalledWith('Pink Floyd');
  });

  it('should default to all-time vinyl plays if query and mentions are empty', async () => {
    vi.mocked(vinylsApi.getVinylsByPlayCount).mockResolvedValue([{ title: 'Greatest Hits', count: 100 }]);

    await ProcessPlayCount(mockMessage as Message, emptyContext());

    expect(vinylsApi.getVinylsByPlayCount).toHaveBeenCalled();
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Albums by Play Count (All Time)',
    }));
  });

  it('should reply with a warning if the list is empty', async () => {
    const context: CommandContext = { ...emptyContext(), query: 'NonExistent' };
    vi.mocked(playsApi.getSortedPlaysByQuery).mockResolvedValue([]);

    await ProcessPlayCount(mockMessage as Message, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining('⚠️ No plays found matching "NonExistent"')
    );
  });
});
