import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../../src/services/supabase.js', () => ({
  default: {
    from: fromMock,
  },
}));

import { getNameById, getUserById, getUserByName, getUsers } from '../../src/services/users.api';

describe('users.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getUsers returns data when query succeeds', async () => {
    const selectMock = vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'alice' }], error: null });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getUsers();

    expect(fromMock).toHaveBeenCalledWith('users');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(result).toEqual([{ id: '1', name: 'alice' }]);
  });

  it('getUsers logs and returns empty array on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('db');
    const selectMock = vi.fn().mockResolvedValue({ data: null, error: err });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getUsers();

    expect(consoleSpy).toHaveBeenCalledWith(err);
    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('getUserByName returns user on success', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: '1', name: 'alice' }, error: null });
    const ilikeMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getUserByName('alice');

    expect(ilikeMock).toHaveBeenCalledWith('name', 'alice');
    expect(result).toEqual({ id: '1', name: 'alice' });
  });

  it('getUserByName returns null on query error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: new Error('query failed') });
    const ilikeMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getUserByName('alice');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getNameById returns name from row', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { name: 'alice' }, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getNameById('id-1');

    expect(eqMock).toHaveBeenCalledWith('id', 'id-1');
    expect(result).toBe('alice');
  });

  it('getNameById returns null and logs on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'bad' } });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getNameById('id-1');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching username:', 'bad');
    consoleSpy.mockRestore();
  });

  it('getUserById returns user on success', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: 'id-1', name: 'alice' }, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getUserById('id-1');

    expect(selectMock).toHaveBeenCalledWith('*');
    expect(result).toEqual({ id: 'id-1', name: 'alice' });
  });

  it('getUserById returns null and logs on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'bad' } });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getUserById('id-1');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching username:', 'bad');
    consoleSpy.mockRestore();
  });
});
