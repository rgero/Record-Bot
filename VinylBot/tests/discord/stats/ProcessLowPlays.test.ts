import * as playsApi from "../../../src/services/plays.api.js";
import * as vinylsApi from "../../../src/services/vinyls.api.js";
import * as usersApi from "../../../src/services/users.api.js";
import * as resolveUserMapModule from "../../../src/utils/resolveUserMap.js";

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { CommandContext } from "../../../src/utils/parseCommand.js";
import { EmbeddedResponse } from "../../../src/utils/discord/EmbeddedResponse.js";
import { ProcessLowPlays } from "../../../src/discord/stats/ProcessLowPlays.js";
import { Message } from "discord.js";

vi.mock("../../../src/services/plays.api.js");
vi.mock("../../../src/services/vinyls.api.js");
vi.mock("../../../src/services/users.api.js");
vi.mock("../../../src/utils/resolveUserMap.js");
vi.mock("../../../src/utils/discord/EmbeddedResponse.js");
vi.mock("../../../src/utils/discordToDropdown.js", () => ({
  getDropdownValue: (str: string) => str.toLowerCase(),
}));
vi.mock("../../../src/utils/escapeColons.js", () => ({
  escapeColons: (str: string) => str,
}));

const emptyContext = (): CommandContext => ({ mentions: [], flags: {}, query: '' });

describe('ProcessLowPlays', () => {
  let mockMessage: any;
  let consoleSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessage = {
      reply: vi.fn().mockResolvedValue({}),
    };
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should fetch least-played albums for a mentioned user', async () => {
    const userId = '123';
    const context: CommandContext = { mentions: [userId as any], flags: {}, query: '' };
    vi.mocked(usersApi.getNameById).mockResolvedValue('JohnDoe');
    vi.mocked(playsApi.getTopPlayedAlbumsByUserID).mockResolvedValue([
      { title: 'Album A', count: 10 },
      { title: 'Album B', count: 2 },
    ]);

    await ProcessLowPlays(mockMessage as Message, context);

    expect(vi.mocked(usersApi.getNameById)).toHaveBeenCalledWith(userId);
    expect(vi.mocked(playsApi.getTopPlayedAlbumsByUserID)).toHaveBeenCalledWith(userId);
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Least Played Albums for JohnDoe',
      list: [
        { title: 'Album B', count: 2 },
        { title: 'Album A', count: 10 },
      ],
    }));
  });

  it('should fetch albums matching a search query', async () => {
    const context: CommandContext = { ...emptyContext(), query: 'Radiohead' };
    vi.mocked(playsApi.getSortedPlaysByQuery).mockResolvedValue([
      { title: 'Kid A', count: 5 },
      { title: 'Paranoid Android', count: 1 },
    ]);

    await ProcessLowPlays(mockMessage as Message, context);

    expect(vi.mocked(playsApi.getSortedPlaysByQuery)).toHaveBeenCalledWith('Radiohead');
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Least Played Albums matching "Radiohead"',
      list: [
        { title: 'Paranoid Android', count: 1 },
        { title: 'Kid A', count: 5 },
      ],
    }));
  });

  it('should fetch least-played albums for the current user when --mine is present', async () => {
    const context: CommandContext = { mentions: [], flags: { mine: true }, query: '' };
    mockMessage.author = { username: 'John' };
    vi.mocked(resolveUserMapModule.resolveUserMap).mockResolvedValue(new Map([['john', ['123']]]));
    vi.mocked(playsApi.getTopPlayedAlbumsByUserID).mockResolvedValue([
      { title: 'Album Mine', count: 8 },
      { title: 'Album Low', count: 1 },
    ]);

    await ProcessLowPlays(mockMessage as Message, context);

    expect(resolveUserMapModule.resolveUserMap).toHaveBeenCalled();
    expect(vi.mocked(playsApi.getTopPlayedAlbumsByUserID)).toHaveBeenCalledWith('123');
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Least Played Albums for your plays',
      list: [
        { title: 'Album Low', count: 1 },
        { title: 'Album Mine', count: 8 },
      ],
    }));
  });

  it('should return all-time least-played albums when no mentions or query are present', async () => {
    vi.mocked(vinylsApi.getVinylsByPlayCount).mockResolvedValue([
      { title: 'Album High', count: 100 },
      { title: 'Album Low', count: 10 },
    ]);

    await ProcessLowPlays(mockMessage as Message, emptyContext());

    expect(vinylsApi.getVinylsByPlayCount).toHaveBeenCalled();
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Least Played Albums (All Time)',
      list: [
        { title: 'Album Low', count: 10 },
        { title: 'Album High', count: 100 },
      ],
    }));
  });

  it('should append descending suffix when dir flag is desc', async () => {
    const context: CommandContext = { ...emptyContext(), flags: { dir: 'desc' } };
    vi.mocked(vinylsApi.getVinylsByPlayCount).mockResolvedValue([
      { title: 'Album High', count: 100 },
      { title: 'Album Low', count: 10 },
    ]);

    await ProcessLowPlays(mockMessage as Message, context);

    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Least Played Albums (All Time) (Descending)',
      list: [
        { title: 'Album High', count: 100 },
        { title: 'Album Low', count: 10 },
      ],
    }));
  });

  it('should filter by maximum play count with limit flag', async () => {
    const context: CommandContext = { ...emptyContext(), flags: { limit: '10' } };
    vi.mocked(vinylsApi.getVinylsByPlayCount).mockResolvedValue([
      { title: 'Album Low', count: 2 },
      { title: 'Album Mid', count: 10 },
      { title: 'Album High', count: 20 },
    ]);

    await ProcessLowPlays(mockMessage as Message, context);

    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Least Played Albums (All Time) <= 10 plays',
      list: [
        { title: 'Album Low', count: 2 },
        { title: 'Album Mid', count: 10 },
      ],
    }));
  });

  it('should warn if no plays are found', async () => {
    const context: CommandContext = { ...emptyContext(), query: 'NonExistent' };
    vi.mocked(playsApi.getSortedPlaysByQuery).mockResolvedValue([]);

    await ProcessLowPlays(mockMessage as Message, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('⚠️ No plays found matching "NonExistent"')); 
  });

  it('should reject multiple mentions', async () => {
    const context: CommandContext = { mentions: ['123' as any, '456' as any], flags: {}, query: '' };

    await ProcessLowPlays(mockMessage as Message, context);

    expect(mockMessage.reply).toHaveBeenCalledWith('❌ Invalid usage. Please mention only one user.');
    expect(EmbeddedResponse).not.toHaveBeenCalled();
  });

  it('should reject --mine with a mention', async () => {
    const context: CommandContext = { mentions: ['123' as any], flags: { mine: true }, query: '' };

    await ProcessLowPlays(mockMessage as Message, context);

    expect(mockMessage.reply).toHaveBeenCalledWith('❌ Invalid usage. Use either --mine or mention a user, not both.');
    expect(EmbeddedResponse).not.toHaveBeenCalled();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });
});
