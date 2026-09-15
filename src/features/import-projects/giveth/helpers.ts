import { getDataSource } from "../../../helpers/db";
import { type GivethProjectInfo } from "./type";
import { emptyTally, recordOutcome, updateOrCreateProject } from "../helpers";
import { ImportTally } from "../types";
import { givethSourceConfig } from "./constants";

export const generateGivethUrl = (project: GivethProjectInfo) => {
  return `/project/${project.slug}`;
};

// Returns a per-outcome tally. `written` is the only bucket that implies SQL was
// issued: an already up-to-date project lands in `unchanged` having produced a
// SELECT and nothing else.
export const processProjectsBatch = async (
  projectsBatch: GivethProjectInfo[]
): Promise<ImportTally> => {
  const tally = emptyTally();
  for (const project of projectsBatch) {
    const processedProject = {
      ...project,
      url: generateGivethUrl(project),
    };
    recordOutcome(
      tally,
      await updateOrCreateProject(processedProject, givethSourceConfig)
    );
  }
  return tally;
};
