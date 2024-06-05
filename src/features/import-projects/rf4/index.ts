import { updateOrCreateProject } from "../helpers";
import { rf4SourceConfig } from "./constants";
import { fetchRf4Projects } from "./service";

export const fetchAndProcessRf4Projects = async () => {
  try {
    const data = await fetchRf4Projects();
    if (!data) return;
    for (const project of data) {
      await updateOrCreateProject(project, rf4SourceConfig);
    }
  } catch (error: any) {
    console.log("error on fetchAndProcessRf4Projects", error.message);
  }
};
