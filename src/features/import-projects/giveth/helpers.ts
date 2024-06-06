import { getDataSource } from "../../../helpers/db";
import { type GivethProjectInfo } from "./type";
import { updateOrCreateProject } from "../helpers";
import { givethSourceConfig } from "./constants";

export const generateGivethUrl = (project: GivethProjectInfo) => {
  return `/project/${project.slug}`;
};

export const processProjectsBatch = async (
  projectsBatch: GivethProjectInfo[]
) => {
  for (const project of projectsBatch) {
    const processedProject = {
      ...project,
      url: generateGivethUrl(project),
    };
    await updateOrCreateProject(processedProject, givethSourceConfig);
  }
};
