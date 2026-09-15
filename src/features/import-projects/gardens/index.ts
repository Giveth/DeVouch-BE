import { GARDEN_API_LIMIT, GARDENS_SUBGRAPHS } from "./constants";
import { fetchGardensProjectsBatch } from "./service";
import { processProjectsBatch } from "./helpers";
import { ImportResult, ImportTally } from "../types";
import { abortImport, addTally, emptyTally, finishImport } from "../helpers";

export const fetchAndProcessGardensProjects =
  async (): Promise<ImportResult> => {
    const tally: ImportTally = emptyTally();
    try {
      const limit = GARDEN_API_LIMIT;

      for (const subgraph of GARDENS_SUBGRAPHS) {
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
          const batch = await fetchGardensProjectsBatch(limit, skip, subgraph);
          if (batch.length > 0) {
            addTally(tally, await processProjectsBatch(batch));
            skip += limit;
          } else {
            hasMore = false;
          }
        }
      }

      return finishImport("gardens", tally);
    } catch (error: any) {
      return abortImport("gardens", tally, error);
    }
  };
