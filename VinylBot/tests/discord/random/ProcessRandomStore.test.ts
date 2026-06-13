import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcessRandomStore } from '../../../src/discord/random/ProcessRandomStore';
import { getPhysicalLocations } from '../../../src/services/locations.api';

vi.mock('../../../src/services/locations.api');

describe('ProcessRandomStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMessage = () => ({ reply: vi.fn().mockResolvedValue({ createMessageComponentCollector: vi.fn().mockReturnValue({ on: vi.fn() }), edit: vi.fn().mockResolvedValue({}) }) } as any);

  it('replies when no stores exist', async () => {
    vi.mocked(getPhysicalLocations).mockResolvedValue([]);
    const message = createMessage();

    await ProcessRandomStore(message);

    expect(message.reply).toHaveBeenCalledWith('❌ No matching entries found.');
  });

  it('sends a random store embed when stores exist', async () => {
    vi.mocked(getPhysicalLocations).mockResolvedValue([{ name: 'Vinyl Shop', address: '123 Main' }] as any);
    const message = createMessage();

    await ProcessRandomStore(message);

    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: '🎲 Random Pick' })],
    }));
  });
});
