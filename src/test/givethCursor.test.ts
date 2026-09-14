import { nextCatalogCursor } from "../features/import-projects/giveth/index";

// The catalog query carries no ordering argument, so the ascending contract
// `afterId` depends on is unenforced by the API. These cover the guards that
// turn a violated contract into a loud failure instead of a truncated import.
describe("Giveth catalog cursor", () => {
  it("advances to the last id of an ascending page", () => {
    expect(nextCatalogCursor([{ id: 10 }, { id: 11 }, { id: 12 }], 9)).toBe(12);
  });

  it("accepts numeric string ids", () => {
    expect(nextCatalogCursor([{ id: "10" }, { id: "12" }], 0)).toBe(12);
  });

  it("throws on a descending page rather than skipping unread rows", () => {
    // Math.max here would return 12, the page's highest id, stepping the cursor
    // past ids 10 and 11 and ending the loop as though the import completed.
    expect(() =>
      nextCatalogCursor([{ id: 12 }, { id: 11 }, { id: 10 }], 0)
    ).toThrow(/not ordered ascending/);
  });

  it("throws when the cursor would not advance", () => {
    expect(() => nextCatalogCursor([{ id: 5 }], 5)).toThrow(
      /did not advance past id 5/
    );
  });

  it("throws on a non-numeric id", () => {
    expect(() => nextCatalogCursor([{ id: "abc" }], 0)).toThrow(
      /non-numeric id/
    );
  });
});
