import { getDataSource } from "../../../helpers/db";
import type { GitcoinProjectInfo } from "./type";
import { updateOrCreateProject } from "../helpers";
import { gitcoinSourceConfig } from "./constants";

export const processProjectsBatch = async (
  projectsBatch: GitcoinProjectInfo[]
) => {
  for (const project of projectsBatch) {
    await updateOrCreateProject(project, gitcoinSourceConfig);
  }
};
