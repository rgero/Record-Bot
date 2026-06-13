import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcessRandomCommand } from '../../../src/discord/random/ProcessRandomCommand';
import { parseCommand } from '../../../src/utils/parseCommand';
import { ProcessRandomAlbum } from '../../../src/discord/random/ProcessRandomAlbum';
import { ProcessRandomLowAlbum } from '../../../src/discord/random/ProcessRandomLowAlbum';
import { ProcessRandomStore } from '../../../src/discord/random/ProcessRandomStore';
import { ProcessRandomUnplayedAlbum } from '../../../src/discord/random/ProcessRandomUnplayedAlbum';

vi.mock('../../../src/utils/parseCommand');
vi.mock('../../../src/discord/random/ProcessRandomAlbum');
vi.mock('../../../src/discord/random/ProcessRandomLowAlbum');
vi.mock('../../../src/discord/random/ProcessRandomStore');
vi.mock('../../../src/discord/random/ProcessRandomUnplayedAlbum');

describe('ProcessRandomCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMessage = () => ({ reply: vi.fn().mockResolvedValue({}) } as any);

  it('replies with parse error when parseCommand returns an error', async () => {
    vi.mocked(parseCommand).mockResolvedValue({ ok: false, error: 'Invalid command' } as any);

    const message = createMessage();
    await ProcessRandomCommand(message);

    expect(message.reply).toHaveBeenCalledWith('❌ Invalid command');
  });

  it('routes --low to ProcessRandomLowAlbum', async () => {
    const context = { flags: { low: true }, mentions: [], query: '' } as any;
    vi.mocked(parseCommand).mockResolvedValue({ ok: true, context } as any);

    const message = createMessage();
    await ProcessRandomCommand(message);

    expect(vi.mocked(ProcessRandomLowAlbum)).toHaveBeenCalledWith(message, context);
  });

  it('routes --store to ProcessRandomStore', async () => {
    const context = { flags: { store: true }, mentions: [], query: '' } as any;
    vi.mocked(parseCommand).mockResolvedValue({ ok: true, context } as any);

    const message = createMessage();
    await ProcessRandomCommand(message);

    expect(vi.mocked(ProcessRandomStore)).toHaveBeenCalledWith(message);
  });

  it('routes --unplayed to ProcessRandomUnplayedAlbum', async () => {
    const context = { flags: { unplayed: true }, mentions: [], query: '' } as any;
    vi.mocked(parseCommand).mockResolvedValue({ ok: true, context } as any);

    const message = createMessage();
    await ProcessRandomCommand(message);

    expect(vi.mocked(ProcessRandomUnplayedAlbum)).toHaveBeenCalledWith(message, context);
  });

  it('rejects multiple primary flags', async () => {
    const context = { flags: { low: true, store: true }, mentions: [], query: '' } as any;
    vi.mocked(parseCommand).mockResolvedValue({ ok: true, context } as any);

    const message = createMessage();
    await ProcessRandomCommand(message);

    expect(message.reply).toHaveBeenCalledWith(
      expect.stringContaining('Multiple primary flags detected')
    );
  });

  it('defaults to ProcessRandomAlbum when no primary flags are set', async () => {
    const context = { flags: {}, mentions: [], query: '' } as any;
    vi.mocked(parseCommand).mockResolvedValue({ ok: true, context } as any);

    const message = createMessage();
    await ProcessRandomCommand(message);

    expect(vi.mocked(ProcessRandomAlbum)).toHaveBeenCalledWith(message, context);
  });
});
