import { describe, expect, it, vi } from 'vitest';

import { Vinyl } from '../../src/interfaces/Vinyl';
import { sortVinyls } from '../../src/utils/sortVinyls';

// Mock normalizeString to just return lowercase for simple testing
vi.mock('../../src/utils/normalizeString', () => ({
  normalizeString: (s: string) => s.toLowerCase().trim(),
}));

describe('sortVinyls', () => {
  const mockVinyls: Partial<Vinyl>[] = [
    { artist: 'Radiohead', album: 'Kid A', length: 47, playCount: 10 },
    { artist: 'Bon Iver', album: 'For Emma', length: 37, playCount: 50 },
    { artist: 'Zaba', album: 'Glass Animals', length: 45, playCount: 5 },
  ];

  const vinyls = mockVinyls as Vinyl[];

  describe('String Sorting (Artist/Album)', () => {
    it('should sort by artist ascending (+)', () => {
      const sorted = sortVinyls(vinyls, 'artist+');
      expect(sorted[0].artist).toBe('Bon Iver');
      expect(sorted[2].artist).toBe('Zaba');
    });

    it('should sort by artist descending (-)', () => {
      const sorted = sortVinyls(vinyls, 'artist-');
      expect(sorted[0].artist).toBe('Zaba');
      expect(sorted[2].artist).toBe('Bon Iver');
    });

    it('should sort by album ascending (+)', () => {
      const sorted = sortVinyls(vinyls, 'album+');
      expect(sorted[0].album).toBe('For Emma');
      expect(sorted[2].album).toBe('Kid A');
    });
  });

  describe('Numeric Sorting (Length/Plays)', () => {
    it('should sort by length ascending', () => {
      const sorted = sortVinyls(vinyls, 'length+');
      expect(sorted[0].length).toBe(37);
      expect(sorted[2].length).toBe(47);
    });

    it('should sort by playCount descending', () => {
      const sorted = sortVinyls(vinyls, 'plays-');
      expect(sorted[0].playCount).toBe(50);
      expect(sorted[2].playCount).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing numeric values by defaulting to 0', () => {
      const incompleteVinyls = [
        { artist: 'A', album: 'A', playCount: 10 },
        { artist: 'B', album: 'B' }, // Missing playCount
      ] as Vinyl[];

      const sorted = sortVinyls(incompleteVinyls, 'plays+');
      expect(sorted[0].artist).toBe('B'); // 0 comes before 10
    });

    it('should return original order if an invalid field is provided', () => {
      const sorted = sortVinyls(vinyls, 'invalid+');
      expect(sorted).toEqual(vinyls);
    });

    it('should not mutate the original array', () => {
      const original = [...vinyls];
      sortVinyls(vinyls, 'artist+');
      expect(vinyls).toEqual(original);
    });
  });
});