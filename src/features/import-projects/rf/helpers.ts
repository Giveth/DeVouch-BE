import { updateOrCreateProject } from "../helpers";
import { rfSourceConfig } from "./constants";
import { RfProjectInfo } from "./type";

export const generateRfUrl = (project: RfProjectInfo) => {
  return `/project/${project.id}`;
};

const processProject = (project: RfProjectInfo, round: number) => {
  const projectData = {
    ...project,
    url: generateRfUrl(project),
    rfRound: round,
  };
  return projectData;
};

export const saveBatchProjects = async (
  projects: RfProjectInfo[],
  round: number
) => {
  for (const _project of projects) {
    const project = processProject(_project, round);
    await updateOrCreateProject(project, rfSourceConfig);
  }
};
