import { describe, expect, it, vi } from 'vitest';

const { getUsersMock } = vi.hoisted(() => ({
  getUsersMock: vi.fn(),
}));

vi.mock('../../src/services/users.api.js', () => ({
  getUsers: getUsersMock,
}));

import { resolveUserMap } from '../../src/utils/resolveUserMap';

describe('resolveUserMap', () => {
  it('builds lowercase lookup and includes both key', async () => {
    getUsersMock.mockResolvedValue([
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ]);

    const result = await resolveUserMap();

    expect(result.get('alice')).toEqual(['u1']);
    expect(result.get('bob')).toEqual(['u2']);
    expect(result.get('both')).toEqual(['u1', 'u2']);
  });

  it('returns only both with empty list when no users exist', async () => {
    getUsersMock.mockResolvedValue([]);

    const result = await resolveUserMap();

    expect(result.get('both')).toEqual([]);
    expect(result.size).toBe(1);
  });
});
