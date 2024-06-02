import { getDataSource } from "../../../helpers/db";
import { fetchRpgf3Projects } from "./service";
import { updateOrCreateProject } from "./helpers";

export const fetchAndProcessRpgf3Projects = async () => {
  const data = await fetchRpgf3Projects();
  if (!data) return;
  const dataSource = await getDataSource();
  if (!dataSource) return;
  for (const project of data) {
    if (project.type.toLowerCase() !== "project") continue;
    await updateOrCreateProject(dataSource, project);
  }
};
