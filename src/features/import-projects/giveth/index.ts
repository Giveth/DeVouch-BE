import { GIVETH_API_LIMIT, givethCatalogConfig } from "./constants";
import { processProjectsBatch } from "./helpers";
import { fetchGivethCatalogBatch } from "./service";
import { nextCatalogCursor } from "./cursor";
import { ImportResult, ImportTally } from "../types";
import {
  abortImport,
  addTally,
  emptyTally,
  finishImport,
  skipImport,
} from "../helpers";

export const fetchAndProcessGivethProjects =
  async (): Promise<ImportResult> => {
    const tally: ImportTally = emptyTally();
    try {
      // Resolved once per run: a partially configured trio or a V5 URL throws
      // here and aborts before any request is sent.
      const config = givethCatalogConfig();
      if (!config) {
        return skipImport(
          "giveth",
          "GIVETH_API_URL, GIVETH_API_USERNAME and GIVETH_API_PASSWORD are not set"
        );
      }

      let hasMoreProjects = true;
      // Keyset cursor: the catalog returns projects with id > afterId, and an
      // empty page means the walk is complete.
      let afterId = 0;

      while (hasMoreProjects) {
        const projectsBatch = await fetchGivethCatalogBatch(
          config,
          GIVETH_API_LIMIT,
          afterId
        );
        if (projectsBatch.length > 0) {
          // `updateOrCreateProject` logs persistence failures instead of
          // throwing, so failures have to be counted rather than caught. The
          // tally keeps writes, unchanged rows and failures apart: a run that
          // inspected everything and wrote nothing is not a complete import.
          addTally(tally, await processProjectsBatch(projectsBatch));
          afterId = nextCatalogCursor(projectsBatch, afterId);
        } else {
          hasMoreProjects = false;
        }
      }

      return finishImport("giveth", tally);
    } catch (error: any) {
      return abortImport("giveth", tally, error);
    }
  };
