import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../../src/services/supabase.js', () => ({
  default: {
    from: fromMock,
  },
}));

import {
  getLocations,
  getLocationsByPurchaseCount,
  getLocationsByPurchaseCountForID,
  getPhysicalLocations,
} from '../../src/services/locations.api';

describe('locations.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLocations returns data', async () => {
    const selectMock = vi.fn().mockResolvedValue({ data: [{ name: 'Store A' }], error: null });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getLocations();

    expect(result).toEqual([{ name: 'Store A' }]);
  });

  it('getLocations logs and returns empty array on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const selectMock = vi.fn().mockResolvedValue({ data: null, error: new Error('db') });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getLocations();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getPhysicalLocations applies address filters and returns data', async () => {
    const neqMock = vi.fn().mockResolvedValue({ data: [{ name: 'Store B' }], error: null });
    const notMock = vi.fn().mockReturnValue({ neq: neqMock });
    const selectMock = vi.fn().mockReturnValue({ not: notMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getPhysicalLocations();

    expect(fromMock).toHaveBeenCalledWith('locations');
    expect(notMock).toHaveBeenCalledWith('address', 'is', null);
    expect(neqMock).toHaveBeenCalledWith('address', '');
    expect(result).toEqual([{ name: 'Store B' }]);
  });

  it('getPhysicalLocations returns empty array on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const neqMock = vi.fn().mockResolvedValue({ data: null, error: new Error('db') });
    const notMock = vi.fn().mockReturnValue({ neq: neqMock });
    const selectMock = vi.fn().mockReturnValue({ not: notMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getPhysicalLocations();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getLocationsByPurchaseCountForID groups and sorts counts', async () => {
    const containsMock = vi.fn().mockResolvedValue({
      data: [
        { purchaseLocation: { name: 'Store A' } },
        { purchaseLocation: { name: 'Store B' } },
        { purchaseLocation: { name: 'Store A' } },
      ],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ contains: containsMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getLocationsByPurchaseCountForID('user-1');

    expect(containsMock).toHaveBeenCalledWith('owners', ['user-1']);
    expect(result).toEqual([
      { title: 'Store A', count: 2 },
      { title: 'Store B', count: 1 },
    ]);
  });

  it('getLocationsByPurchaseCountForID returns empty when data is null', async () => {
    const containsMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectMock = vi.fn().mockReturnValue({ contains: containsMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getLocationsByPurchaseCountForID('user-1');

    expect(result).toEqual([]);
  });

  it('getLocationsByPurchaseCountForID throws when query fails', async () => {
    const err = new Error('db');
    const containsMock = vi.fn().mockResolvedValue({ data: null, error: err });
    const selectMock = vi.fn().mockReturnValue({ contains: containsMock });
    fromMock.mockReturnValue({ select: selectMock });

    await expect(getLocationsByPurchaseCountForID('user-1')).rejects.toThrow('db');
  });

  it('getLocationsByPurchaseCount maps ordered locations', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [
        { name: 'Store A', purchaseCount: 4 },
        { name: 'Store B', purchaseCount: 2 },
      ],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getLocationsByPurchaseCount();

    expect(orderMock).toHaveBeenCalledWith('purchaseCount', { ascending: false });
    expect(result).toEqual([
      { title: 'Store A', count: 4 },
      { title: 'Store B', count: 2 },
    ]);
  });

  it('getLocationsByPurchaseCount throws on error', async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: null, error: new Error('db') });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    fromMock.mockReturnValue({ select: selectMock });

    await expect(getLocationsByPurchaseCount()).rejects.toThrow('db');
  });
});
