import { GIVETH_API_LIMIT } from "./constants";
import { processProjectsBatch } from "./helpers";
import { fetchGivethProjectsBatch, fetchGivethCatalogBatch } from "./service";

export const fetchAndProcessGivethProjects = async () => {
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
        if (useCatalog) {
          // Do not assume the catalog pages ascending by id - take the highest
          // id in the batch so the cursor advances whatever the page ordering.
          const ids = projectsBatch
            .map((project: { id: string | number }) => Number(project.id))
            .filter((id: number) => Number.isSafeInteger(id));
          const nextId = ids.length > 0 ? Math.max(...ids) : NaN;
          if (!Number.isSafeInteger(nextId) || nextId <= skip) {
            throw new Error(
              `Giveth catalog cursor did not advance past id ${skip}`
            );
          }
          skip = nextId;
        } else {
          skip += limit;
        }
      } else {
        hasMoreProjects = false;
      }
    }
    console.log(`Giveth import completed: ${imported} projects processed`);
  } catch (error: any) {
    // The import aborted part-way: say so loudly, with the count already
    // written, so a truncated run is not mistaken for a completed one.
    console.log(
      `[${new Date().toISOString()}] - ERROR: Giveth import aborted after ${imported} projects:`,
      error.message
    );
  }
};
