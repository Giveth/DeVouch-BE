import { updateOrCreateProject } from "../helpers";
import { rpgf3SourceConfig } from "./constants";
import { fetchRpgf3Projects } from "./service";

export const fetchAndProcessRpgf3Projects = async () => {
  try {
    const data = await fetchRpgf3Projects();
    if (!data) return;
    for (const project of data) {
      if (project.type.toLowerCase() !== "project") continue;
      await updateOrCreateProject(project, rpgf3SourceConfig);
    }
  } catch (error: any) {
    console.log("error on fetchAndProcessRpgf3Projects", error.message);
  }
};
