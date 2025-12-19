import { beforeEach, describe, expect, it, vi } from "vitest";

import { getData } from "../../src/google/GetData";
import { getRandomRow } from "../../src/google/GetRandomRow";

vi.mock("../../src/google/GetData", () => ({
  getData: vi.fn(),
}));

describe("getRandomRow", () => {
  const mockData = [
    ["Apple", "Red"],
    ["Banana", "Yellow"],
    ["Cherry", "Red"],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should return null if no data is returned", async () => {
    vi.mocked(getData).mockResolvedValue([]);
    
    const result = await getRandomRow({});
    expect(result).toBeNull();
  });

  it("should return a random row when no filters are applied", async () => {
    vi.mocked(getData).mockResolvedValue(mockData);
    
    // Mock Math.random to always pick the second item (Banana)
    // index = floor(0.5 * 3) = 1
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = await getRandomRow({});
    
    expect(result).toEqual(["Banana", "Yellow"]);
    spy.mockRestore();
  });

  it("should filter rows based on column index and value", async () => {
    vi.mocked(getData).mockResolvedValue(mockData);

    // Filter for "Red" in the second column (index 1)
    // Should filter down to [["Apple", "Red"], ["Cherry", "Red"]]
    const result = await getRandomRow({ filterColumnIndex: 1, filterValue: "Red" });

    expect(result).not.toContain("Banana");
    expect(result[1]).toBe("Red");
  });

  it("should be case-insensitive when filtering", async () => {
    vi.mocked(getData).mockResolvedValue(mockData);

    const result = await getRandomRow({ filterColumnIndex: 0, filterValue: "APPLE" });

    expect(result).toEqual(["Apple", "Red"]);
  });

  it("should return null if filters result in zero matches", async () => {
    vi.mocked(getData).mockResolvedValue(mockData);

    const result = await getRandomRow({ filterColumnIndex: 0, filterValue: "Grape" });

    expect(result).toBeNull();
  });
});