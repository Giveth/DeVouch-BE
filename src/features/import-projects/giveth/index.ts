import { processProjectsBatch } from "./helpers";
import { fetchGivethProjectsBatch } from "./service";

export const fetchAndProcessGivethProjects = async () => {
  try {
    let hasMoreProjects = true;
    let skip = 0;
    const limit = 10;

    while (hasMoreProjects) {
      const projectsBatch = await fetchGivethProjectsBatch(limit, skip);
      if (projectsBatch.length > 0) {
        await processProjectsBatch(projectsBatch);
        skip += limit;
      } else {
        hasMoreProjects = false;
      }
    }
  } catch (error: any) {
    console.log("error on fetching giveth projects", error.message);
  }
};