import { addWantedItem, getWantList } from '../../src/services/wantlist.api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../../src/services/supabase.js', () => ({
  default: {
    from: fromMock,
  },
}));



describe('wantlist.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getWantList uses contains for user queries', async () => {
    const containsMock = vi.fn().mockResolvedValue({ data: [{ artist: 'A', album: 'B' }], error: null });
    const selectMock = vi.fn().mockReturnValue({ contains: containsMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getWantList({ type: 'user', term: 'u1' });

    expect(fromMock).toHaveBeenCalledWith('wanted_items');
    expect(containsMock).toHaveBeenCalledWith('searcher', ['u1']);
    expect(result).toEqual([{ artist: 'A', album: 'B' }]);
  });

  it('getWantList uses or for search queries', async () => {
    const orMock = vi.fn().mockResolvedValue({ data: [{ artist: 'A', album: 'B' }], error: null });
    const selectMock = vi.fn().mockReturnValue({ or: orMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getWantList({ type: 'search', term: 'rise against' });

    expect(orMock).toHaveBeenCalledWith('artist.wfts.rise against,album.wfts.rise against');
    expect(result).toEqual([{ artist: 'A', album: 'B' }]);
  });

  it('getWantList returns empty array when no data', async () => {
    const selectMock = vi.fn().mockResolvedValue({ data: null, error: null });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getWantList({ type: 'none', term: 'x' });

    expect(result).toEqual([]);
  });

  it('getWantList throws when supabase returns error', async () => {
    const err = new Error('db');
    const selectMock = vi.fn().mockResolvedValue({ data: null, error: err });
    fromMock.mockReturnValue({ select: selectMock });

    await expect(getWantList({ type: 'none', term: 'x' })).rejects.toThrow('db');
  });

  it('addWantedItem returns ADDED when insert succeeds', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ insert: insertMock });

    const result = await addWantedItem({ artist: 'A', album: 'B', searcher: ['u1'] } as any);

    expect(result).toBe('ADDED');
    expect(insertMock).toHaveBeenCalledWith([{ artist: 'A', album: 'B', searcher: ['u1'] }]);
  });

  it('addWantedItem keeps album length metadata in the insert payload', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ insert: insertMock });

    const result = await addWantedItem({
      artist: 'A',
      album: 'B',
      searcher: ['u1'],
      length: 42,
    } as any);

    expect(result).toBe('ADDED');
    expect(insertMock).toHaveBeenCalledWith([{ artist: 'A', album: 'B', searcher: ['u1'], length: 42 }]);
  });

  it('addWantedItem returns DUPLICATE for unique violation', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: { code: '23505', message: 'dup' } });
    fromMock.mockReturnValue({ insert: insertMock });

    const result = await addWantedItem({ artist: 'A', album: 'B', searcher: ['u1'] } as any);

    expect(result).toBe('DUPLICATE');
  });

  it('addWantedItem returns ERROR for non-duplicate failures', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const insertMock = vi.fn().mockResolvedValue({ error: { code: 'xx', message: 'bad insert' } });
    fromMock.mockReturnValue({ insert: insertMock });

    const result = await addWantedItem({ artist: 'A', album: 'B', searcher: ['u1'] } as any);

    expect(result).toBe('ERROR');
    expect(consoleSpy).toHaveBeenCalledWith('Supabase Error:', 'bad insert');
    consoleSpy.mockRestore();
  });
});
