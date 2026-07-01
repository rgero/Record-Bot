import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchMock, getMasterVersionsMock, getReleaseMock, DiscogsClientMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  getMasterVersionsMock: vi.fn(),
  getReleaseMock: vi.fn(),
  DiscogsClientMock: vi.fn(),
}));

vi.mock("@lionralfs/discogs-client", () => ({
  DiscogsClient: DiscogsClientMock,
}));

import { CheckAlbumExistence, isVinylReleaseFormat, scoreMatch } from "../../src/discogs/CheckAlbumExistence.js";

describe("CheckAlbumExistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.DISCOG_KEY = "k";
    process.env.DISCOG_SECRET = "s";

    DiscogsClientMock.mockImplementation(function () {
      return {
      database: () => ({
        search: searchMock,
        getMasterVersions: getMasterVersionsMock,
        getRelease: getReleaseMock,
      }),
      };
    });
  });

  it("throws when DISCogs credentials are missing", async () => {
    delete process.env.DISCOG_KEY;
    delete process.env.DISCOG_SECRET;

    await expect(CheckAlbumExistence("A", "B")).rejects.toThrow(
      "Discogs DISCOG_KEY and DISCOG_SECRET must be set in the environment."
    );
  });

  it("returns exists true when matching master has a vinyl version", async () => {
    searchMock.mockResolvedValueOnce({
      data: {
        results: [{ id: 10, type: "master", title: "Artist - Album", cover_image: "cover.jpg" }],
      },
    });
    getMasterVersionsMock.mockResolvedValueOnce({
      data: {
        versions: [{ format: "Vinyl" }],
      },
    });

    const result = await CheckAlbumExistence("Artist", "Album");

    expect(result).toEqual({ title: "Artist - Album", cover: "cover.jpg", exists: true });
    expect(getReleaseMock).not.toHaveBeenCalled();
  });

  it("falls back to release search and detects standalone vinyl release", async () => {
    searchMock
      .mockResolvedValueOnce({ data: { results: [] } })
      .mockResolvedValueOnce({ data: { results: [] } })
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 33, type: "release", title: "Artist - Album" }],
        },
      });

    getReleaseMock.mockResolvedValueOnce({
      data: {
        title: "Artist - Album",
        formats: [{ name: "Vinyl", descriptions: ["LP"] }],
        images: [{ uri: "img://cover" }],
      },
    });

    const result = await CheckAlbumExistence("Artist", "Album");

    expect(result).toEqual({
      title: "Artist - Album",
      cover: "img://cover",
      exists: true,
    });
    expect(searchMock).toHaveBeenCalledTimes(3);
    expect(searchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ query: "Artist Album", type: "master" })
    );
  });

  it("ignores promo releases and returns not found", async () => {
    searchMock
      .mockResolvedValueOnce({ data: { results: [] } })
      .mockResolvedValueOnce({ data: { results: [] } })
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 55, type: "release", title: "Artist - Album" }],
        },
      });

    getReleaseMock.mockResolvedValueOnce({
      data: {
        title: "Artist - Album Promo",
        formats: [{ name: "Vinyl" }],
        images: [],
      },
    });

    const result = await CheckAlbumExistence("Artist", "Album");

    expect(result).toEqual({ title: "Artist - Album", exists: false });
  });
});

describe("scoreMatch", () => {
  it("accepts self-titled bbno$ despite punctuation stripping", () => {
    const match = scoreMatch("bbno$", "bbno$", "bbno$ - bbno$");
    expect(match.passes).toBe(true);
  });
});

describe("isVinylReleaseFormat", () => {
  it("detects vinyl from release format blocks", () => {
    expect(
      isVinylReleaseFormat([
        { name: "Vinyl", qty: "2", descriptions: ["LP", "45 RPM", "Album", "Stereo"] },
      ] as Parameters<typeof isVinylReleaseFormat>[0])
    ).toBe(true);
  });

  it("returns false for CD-only releases", () => {
    expect(isVinylReleaseFormat([{ name: "CD", descriptions: ["Album"] }])).toBe(false);
  });
});
