import { GIVETH_API_LIMIT } from "./constants";
import { processProjectsBatch } from "./helpers";
import { fetchGivethProjectsBatch, fetchGivethCatalogBatch } from "./service";
import { nextCatalogCursor } from "./cursor";
import { ImportResult, ImportTally } from "../types";
import { abortImport, addTally, emptyTally, finishImport } from "../helpers";

export const fetchAndProcessGivethProjects =
  async (): Promise<ImportResult> => {
    const tally: ImportTally = emptyTally();
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
          // `updateOrCreateProject` logs persistence failures instead of
          // throwing, so failures have to be counted rather than caught. The
          // tally keeps writes, unchanged rows and failures apart: a run that
          // inspected everything and wrote nothing is not a complete import.
          addTally(tally, await processProjectsBatch(projectsBatch));
          skip = useCatalog
            ? nextCatalogCursor(projectsBatch, skip)
            : skip + limit;
        } else {
          hasMoreProjects = false;
        }
      }

      return finishImport("giveth", tally);
    } catch (error: any) {
      return abortImport("giveth", tally, error);
    }
  };
