import { GIVETH_API_LIMIT } from "./constants";
import { processProjectsBatch } from "./helpers";
import { fetchGivethProjectsBatch, fetchGivethCatalogBatch } from "./service";
import { ImportResult } from "../types";

// `devouchProjectCatalog` is a keyset cursor on `afterId`, so a page is
// contractually ascending by id and the next cursor is its LAST element. Verify
// that ordering rather than assume it: on a descending page the last id is not
// the highest, so advancing to it would step past rows we never read and end the
// loop early - reporting a truncated import as a completed one.
export const nextCatalogCursor = (
  projectsBatch: { id: string | number }[],
  cursor: number
): number => {
  const ids = projectsBatch.map((project) => Number(project.id));
  if (ids.some((id) => !Number.isSafeInteger(id))) {
    throw new Error("Giveth catalog returned a project with a non-numeric id");
  }

  const nextId = ids[ids.length - 1];
  if (nextId !== Math.max(...ids)) {
    throw new Error(
      `Giveth catalog page is not ordered ascending by id (last ${nextId}, highest ${Math.max(
        ...ids
      )})`
    );
  }
  if (nextId <= cursor) {
    throw new Error(`Giveth catalog cursor did not advance past id ${cursor}`);
  }

  return nextId;
};

export const fetchAndProcessGivethProjects =
  async (): Promise<ImportResult> => {
    let imported = 0;
    try {
      let hasMoreProjects = true;
      let skip = 0;
      const limit = GIVETH_API_LIMIT;
      const useCatalog = process.env.GIVETH_API_VERSION === "6";

      while (hasMoreProjects) {
        const projectsBatch = await (useCatalog
          ? fetchGivethCatalogBatch(limit, skip)
          : fetchGivethProjectsBatch(limit, skip));
        if (projectsBatch.length > 0) {
          await processProjectsBatch(projectsBatch);
          imported += projectsBatch.length;
          skip = useCatalog
            ? nextCatalogCursor(projectsBatch, skip)
            : skip + limit;
        } else {
          hasMoreProjects = false;
        }
      }
      console.log(`Giveth import completed: ${imported} projects processed`);
      return { source: "giveth", ok: true, imported };
    } catch (error: any) {
      // The import aborted part-way: say so loudly, with the count already
      // written, and report it back so the caller can tell a truncated run from
      // a complete one instead of only a human reading container logs.
      console.log(
        `[${new Date().toISOString()}] - ERROR: Giveth import aborted after ${imported} projects:`,
        error.message
      );
      return { source: "giveth", ok: false, imported, error: error.message };
    }
  };
