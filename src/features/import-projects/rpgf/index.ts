import { getDataSource } from "../../../helpers/db";
import { updateOrCreateProject } from "../helpers";
import { rpgf3SourceConfig } from "./constants";
import { fetchRpgf3Projects } from "./service";

export const fetchAndProcessRpgf3Projects = async () => {
  const data = await fetchRpgf3Projects();
  if (!data) return;
  const dataSource = await getDataSource();
  if (!dataSource) return;
  for (const project of data) {
    if (project.type.toLowerCase() !== "project") continue;
    await updateOrCreateProject(dataSource, project, rpgf3SourceConfig);
  }
};
