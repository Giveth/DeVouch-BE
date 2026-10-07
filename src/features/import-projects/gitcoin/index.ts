import { GITCOIN_API_LIMIT } from "./constants";
import { processProjectsBatch } from "./helpers";
import { fetchGitcoinProjectsBatch } from "./service";
import { ImportResult, ImportTally } from "../types";
import { abortImport, addTally, emptyTally, finishImport } from "../helpers";

export const fetchAndProcessGitcoinProjects =
  async (): Promise<ImportResult> => {
    const tally: ImportTally = emptyTally();
    try {
      let hasMoreProjects = true;
      let skip = 0;
      const limit = GITCOIN_API_LIMIT;

      while (hasMoreProjects) {
        const projectsBatch = await fetchGitcoinProjectsBatch(limit, skip);
        if (projectsBatch.length > 0) {
          addTally(tally, await processProjectsBatch(projectsBatch));
          skip += limit;
        } else {
          hasMoreProjects = false;
        }
      }

      return finishImport("gitcoin", tally);
    } catch (error: any) {
      return abortImport("gitcoin", tally, error);
    }
  };
