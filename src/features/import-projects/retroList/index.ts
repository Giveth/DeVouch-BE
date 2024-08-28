import { updateOrCreateProject } from "../helpers";
import { rlSourceConfig } from "./constants";
import { generateRlUrl } from "./helper";
import { fetchRlProjects } from "./service";

export const fetchAndProcessRlProjects = async (round: number) => {
  try {
    const data = await fetchRlProjects(round);
    if (!data) return;
    for (const project of data) {
      const processedProject = {
        ...project,
        url: generateRlUrl(project),
        rfRound: round,
      };

      await updateOrCreateProject(processedProject, rlSourceConfig);
    }
  } catch (error: any) {
    console.log("error on fetchAndProcessRlProjects", error.message);
  }
};
