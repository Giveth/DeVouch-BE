import { updateOrCreateProject } from "../helpers";
import { rlSourceConfig } from "./constants";
import { generateRlUrl, manageProjectRemovals } from "./helper";
import { fetchRlProjects } from "./service";

export const fetchAndProcessRlProjects = async (
  round: number,
  shouldHandlePrelimResult: boolean = true
) => {
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

    // After processing all new projects, handle projects not in the new dataset for the current round
    if (shouldHandlePrelimResult)
      await manageProjectRemovals(data, rlSourceConfig, round);
  } catch (error: any) {
    console.log("error on fetchAndProcessRlProjects", error.message);
  }
};
