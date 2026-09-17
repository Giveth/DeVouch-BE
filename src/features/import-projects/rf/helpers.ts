import { emptyTally, recordProject } from "../helpers";
import { ImportTally } from "../types";
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
): Promise<ImportTally> => {
  const tally = emptyTally();
  for (const _project of projects) {
    const project = processProject(_project, round);
    await recordProject(tally, project, rfSourceConfig);
  }
  return tally;
};
