import { updateOrCreateProject } from "../helpers";
import { rf4SourceConfig } from "./constants";
import { generateRf4Url } from "./helpers";
import { fetchRf4Projects } from "./service";

export const fetchAndProcessRf4Projects = async () => {
  try {
    const data = await fetchRf4Projects();
    if (!data) return;
    for (const project of data) {
      const processedProject = {
        ...project,
        url: generateRf4Url(project),
      }
      await updateOrCreateProject(processedProject, rf4SourceConfig);
    }
  } catch (error: any) {
    console.log("error on fetchAndProcessRf4Projects", error.message);
  }
};
