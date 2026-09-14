import { getDataSource } from "../../../helpers/db";
import { type GivethProjectInfo } from "./type";
import { updateOrCreateProject } from "../helpers";
import { givethSourceConfig } from "./constants";

export const generateGivethUrl = (project: GivethProjectInfo) => {
  return `/project/${project.slug}`;
};

// Returns how many of the batch actually reached the database, so the caller
// counts persisted projects rather than fetched ones.
export const processProjectsBatch = async (
  projectsBatch: GivethProjectInfo[]
): Promise<number> => {
  let persisted = 0;
  for (const project of projectsBatch) {
    const processedProject = {
      ...project,
      url: generateGivethUrl(project),
    };
    if (await updateOrCreateProject(processedProject, givethSourceConfig)) {
      persisted++;
    }
  }
  return persisted;
};
