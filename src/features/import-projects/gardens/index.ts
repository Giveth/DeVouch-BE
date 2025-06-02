import { GARDEN_API_LIMIT, GARDENS_SUBGRAPHS } from "./constants";
import { fetchGardensProjectsBatch } from "./service";
import { processProjectsBatch } from "./helpers";

export const fetchAndProcessGardensProjects = async () => {
  try {
    let hasMoreProjects = true;
    let skip = 0;
    const limit = GARDEN_API_LIMIT;

    for (const subgraph of GARDENS_SUBGRAPHS) {
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        const batch = await fetchGardensProjectsBatch(limit, skip, subgraph);
        if (batch.length > 0) {
          await processProjectsBatch(batch);
          skip += limit;
        } else {
          hasMore = false;
        }
      }
    }
  } catch (error: any) {
    console.log("error on fetchAndProcessGardensProjects", error.message);
  }
};

