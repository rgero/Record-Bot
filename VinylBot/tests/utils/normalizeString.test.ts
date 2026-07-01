import { describe, expect, it } from 'vitest';

import { normalizeString } from '../../src/utils/normalizeString';

describe('normalizeString', () => {
  it('removes leading articles and trims', () => {
    expect(normalizeString('The Wall')).toBe('wall');
    expect(normalizeString('An Awesome Wave')).toBe('awesome wave');
    expect(normalizeString('a Moon Shaped Pool')).toBe('moon shaped pool');
    expect(normalizeString('  Kid A  ')).toBe('kid a');
  });

  it('handles empty input safely', () => {
    expect(normalizeString()).toBe('');
  });

  it('keeps string content when no article prefix exists', () => {
    expect(normalizeString('Kid A')).toBe('kid a');
  });
});
