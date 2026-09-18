// Kept in its own module with no imports: `src/constants.ts` asserts required
// env vars at module scope, so importing this pure function through
// `giveth/index.ts` would make its unit test require the full app environment.

// `devouchProjectCatalog` is a keyset cursor on `afterId`, so a page is
// contractually ascending by id and the next cursor is its LAST element. Verify
// that ordering rather than assume it: if the page is not ascending, the last id
// is not the one that read furthest, so advancing to it would step past rows we
// never read and end the loop early - reporting a truncated import as a
// completed one.
//
// The whole page must be checked pairwise, not just last-vs-highest: a page like
// [10, 5, 12] ends on its highest id yet is still unordered, and an API that
// returns unordered pages cannot guarantee `afterId` covers every row.
export const nextCatalogCursor = (
  projectsBatch: { id: string | number }[],
  cursor: number
): number => {
  const ids = projectsBatch.map((project) => Number(project.id));
  // Without this, `ids[ids.length - 1]` is undefined, `undefined <= cursor` is
  // false via NaN, and the function returns undefined despite declaring number.
  if (ids.length === 0) {
    throw new Error(
      "Giveth catalog page is empty - there is no cursor to take"
    );
  }
  if (ids.some((id) => !Number.isSafeInteger(id))) {
    throw new Error("Giveth catalog returned a project with a non-numeric id");
  }

  for (let i = 1; i < ids.length; i++) {
    if (ids[i] <= ids[i - 1]) {
      throw new Error(
        `Giveth catalog page is not ordered ascending by id (${
          ids[i - 1]
        } then ${ids[i]})`
      );
    }
  }

  const nextId = ids[ids.length - 1];
  if (nextId <= cursor) {
    throw new Error(`Giveth catalog cursor did not advance past id ${cursor}`);
  }

  return nextId;
};
