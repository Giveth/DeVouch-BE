import { GIVETH_API_LIMIT } from "./constants";
import { processProjectsBatch } from "./helpers";
import { fetchGivethProjectsBatch, fetchGivethCatalogBatch } from "./service";
import { nextCatalogCursor } from "./cursor";
import { ImportResult } from "../types";

export const fetchAndProcessGivethProjects =
  async (): Promise<ImportResult> => {
    let imported = 0;
    let dropped = 0;
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
          // Count what reached the database, not what was fetched:
          // `updateOrCreateProject` logs persistence failures instead of
          // throwing, so a fetched count would report a run that wrote nothing
          // as a complete import.
          const persisted = await processProjectsBatch(projectsBatch);
          imported += persisted;
          dropped += projectsBatch.length - persisted;
          skip = useCatalog
            ? nextCatalogCursor(projectsBatch, skip)
            : skip + limit;
        } else {
          hasMoreProjects = false;
        }
      }

      if (dropped > 0) {
        const error = `${dropped} project(s) failed to persist`;
        console.log(
          `[${new Date().toISOString()}] - ERROR: Giveth import incomplete: ${imported} projects written, ${error}`
        );
        return { source: "giveth", ok: false, imported, error };
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
