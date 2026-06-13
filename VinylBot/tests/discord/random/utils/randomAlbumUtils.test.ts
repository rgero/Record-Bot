import { describe, expect, it } from 'vitest';
import { getRandomItem, buildAlbumEmbed, buildAlbumRow } from '../../../../src/discord/random/utils/randomAlbumUtils';

describe('randomAlbumUtils', () => {
  it('selects a random item from a list', () => {
    const list = [1, 2, 3];
    const selected = getRandomItem(list);

    expect(list).toContain(selected);
  });

  it('builds an album embed with title and fields', () => {
    const vinyl = { artist: 'Artist', album: 'Album', length: 42 } as any;
    const embed = buildAlbumEmbed(vinyl, 'Test Title');

    expect(embed.title).toBe('Test Title');
    expect(embed.fields).toEqual([
      expect.objectContaining({ name: 'Artist', value: 'Album' }),
      expect.objectContaining({ name: '⏱️ Length', value: '42 min' }),
    ]);
  });

  it('builds a row with play, reroll, and cancel buttons', () => {
    const row = buildAlbumRow({ showPlay: true });

    expect(row.components.length).toBe(3);
    expect(row.components.map((c: any) => c.data.custom_id)).toEqual(['play', 'reroll', 'cancel']);
  });
});
