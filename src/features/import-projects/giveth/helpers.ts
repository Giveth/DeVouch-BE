import { getDataSource } from "../../../helpers/db";
import { GivethProjectInfo } from "./type";
import { updateOrCreateProject } from "../helpers";
import { givethSourceConfig } from "./constants";

export const processProjectsBatch = async (
  projectsBatch: GivethProjectInfo[]
) => {
  const dataSource = await getDataSource();
  if (!dataSource) return;
  for (const project of projectsBatch) {
    console.log("Processing Project: Giveth", project.id);
    await updateOrCreateProject(dataSource, project, givethSourceConfig);
  }
};
