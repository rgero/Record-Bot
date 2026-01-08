import { describe, expect, it } from "vitest";

import { escapeColons } from "../../src/utils/escapeColons.js"

describe("extraColon", () => {
  it("returns correct string when escaped", () => {
    const testString = "Heaven :x: Hell"
    const result = escapeColons(testString);

    expect(result).toBe("Heaven \\:x\\: Hell")
  })

  it("returns correct string no escape needed", () => {
    const testString = "Heaven Hell"
    const result = escapeColons(testString);

    expect(result).toBe("Heaven Hell")
  })
})