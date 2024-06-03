import { GITCOIN_API_LIMIT } from "./constants";
import { processProjectsBatch } from "./helpers";
import { fetchGitcoinProjectsBatch } from "./service";

export const fetchAndProcessGitcoinProjects = async () => {
  try {
    let hasMoreProjects = true;
    let skip = 0;
    const limit = GITCOIN_API_LIMIT;

    while (hasMoreProjects) {
      const projectsBatch = await fetchGitcoinProjectsBatch(limit, skip);
      if (projectsBatch.length > 0) {
        await processProjectsBatch(projectsBatch);
        skip += limit;
      } else {
        hasMoreProjects = false;
      }
    }
  } catch (error: any) {
    console.log("error on fetchAndProcessGitcoinProjects", error.message);
  }
};
