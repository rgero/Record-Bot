import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAlbumList } from "../../src/google/GetAlbumList.js";
import { getData } from "../../src/google/GetData.js";

vi.mock("../../src/google/GetData.js", () => ({ getData: vi.fn() }));

describe("getAlbumList", () => {
  const mockWantData = [[1, "Artist A", "Album 1", "", "UserWant"]];
  const mockHaveData = [[1, "Artist B", "Album 2", "", "", "", "UserHave"]];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WANT_LIST_SHEET_NAME = "WantSheet";
    process.env.ALBUM_SHEET_NAME = "HaveSheet";
  });

  it("should use index 3 for user filtering on Want List", async () => {
    vi.mocked(getData).mockResolvedValue(mockWantData);
    
    const result = await getAlbumList("want", { type: "user", term: "UserWant" });
    
    expect(getData).toHaveBeenCalledWith("WantSheet");
    expect(result).toHaveLength(1);
    expect(result[0][1]).toBe("Artist A");
  });

  it("should use index 6 for user filtering on Have List", async () => {
    vi.mocked(getData).mockResolvedValue(mockHaveData);
    
    const result = await getAlbumList("have", { type: "user", term: "UserHave" });
    
    expect(getData).toHaveBeenCalledWith("HaveSheet");
    expect(result).toHaveLength(1);
    expect(result[0][1]).toBe("Artist B");
  });

  it("should perform a cross-column search for 'search' type", async () => {
    const searchData = [
      [1, "Linkin Park", "Hybrid Theory"],
      [2, "The Theory", "Some Album"]
    ];
    vi.mocked(getData).mockResolvedValue(searchData);

    const result = await getAlbumList("have", { type: "search", term: "Theory" });

    // Should find both: one in Album title, one in Artist name
    expect(result).toHaveLength(2);
  });
});