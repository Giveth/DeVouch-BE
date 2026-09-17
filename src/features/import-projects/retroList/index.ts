import {
  abortImport,
  emptyTally,
  finishImport,
  recordProject,
} from "../helpers";
import { ImportResult, ImportTally } from "../types";
import { rlSourceConfig } from "./constants";
import { generateRlUrl, manageProjectRemovals } from "./helper";
import { fetchRlProjects } from "./service";

export const fetchAndProcessRlProjects = async (
  round: number,
  shouldHandlePrelimResult: boolean = true
): Promise<ImportResult> => {
  const source = `retroList-round-${round}`;
  const tally: ImportTally = emptyTally();
  try {
    const data = await fetchRlProjects(round);
    if (!data) {
      return abortImport(
        source,
        tally,
        new Error(`No retroList data for round ${round}`)
      );
    }

    for (const project of data) {
      const processedProject = {
        ...project,
        url: generateRlUrl(project),
        rfRound: round,
      };

      await recordProject(tally, processedProject, rlSourceConfig);
    }

    // After processing all new projects, handle projects not in the new dataset for the current round
    if (shouldHandlePrelimResult)
      await manageProjectRemovals(data, rlSourceConfig, round);

    return finishImport(source, tally);
  } catch (error: any) {
    return abortImport(source, tally, error);
  }
};
