import { getDataSource } from "../../../helpers/db";
import { type GivethProjectInfo } from "./type";
import { updateOrCreateProject } from "../helpers";
import { givethSourceConfig } from "./constants";

export const processProjectsBatch = async (
  projectsBatch: GivethProjectInfo[]
) => {
  for (const project of projectsBatch) {
    await updateOrCreateProject(project, givethSourceConfig);
  }
};
