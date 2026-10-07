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

      // One subgraph per chain, each independently reachable: catch inside the
      // loop so an error from one (a rate-limited gateway, a missing
      // THEGRAPH_API_KEY) does not skip the healthy chains after it. The
      // failures are still surfaced on the result rather than swallowed.
      const subgraphErrors: string[] = [];

      for (const subgraph of GARDENS_SUBGRAPHS) {
        let skip = 0;
        let hasMore = true;

        try {
          while (hasMore) {
            const batch = await fetchGardensProjectsBatch(
              limit,
              skip,
              subgraph
            );
            if (batch.length > 0) {
              addTally(tally, await processProjectsBatch(batch));
              skip += limit;
            } else {
              hasMore = false;
            }
          }
        } catch (error: any) {
          const message = `${subgraph.name}: ${error?.message ?? error}`;
          console.log(
            `[${new Date().toISOString()}] - ERROR: gardens subgraph failed, continuing with the rest - ${message}`
          );
          subgraphErrors.push(message);
        }
      }

      const result = finishImport("gardens", tally);
      if (subgraphErrors.length === 0) return result;

      const error = `${subgraphErrors.length} of ${
        GARDENS_SUBGRAPHS.length
      } subgraph(s) failed: ${subgraphErrors.join("; ")}`;
      console.log(
        `[${new Date().toISOString()}] - ERROR: gardens import incomplete: ${error}`
      );
      return {
        ...result,
        ok: false,
        error: result.error ? `${result.error}; ${error}` : error,
      };
    } catch (error: any) {
      return abortImport("gardens", tally, error);
    }
  };
