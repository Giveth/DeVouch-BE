import { updateOrCreateProject } from "../helpers";
import { rlSourceConfig } from "./constants";
import { generateRlUrl, removeNonExistingProjects } from "./helper";
import { fetchRlProjects } from "./service";

export const fetchAndProcessRlProjects = async (round: number) => {
  try {
    const data = await fetchRlProjects(round);
    if (!data) return;

    const processedProjectIds: string[] = [];

    for (const project of data) {
      const processedProject = {
        ...project,
        url: generateRlUrl(project),
        rfRound: round,
      };

      const processedId = await updateOrCreateProject(
        processedProject,
        rlSourceConfig
      );
      if (processedId) {
        processedProjectIds.push(processedId);
      }
    }

    // After processing all new projects, handle projects not in the new dataset for the current round
    await removeNonExistingProjects(processedProjectIds, rlSourceConfig, round);
  } catch (error: any) {
    console.log("error on fetchAndProcessRlProjects", error.message);
  }
};
