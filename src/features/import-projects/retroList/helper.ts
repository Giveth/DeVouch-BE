import { getDataSource } from "../../../helpers/db";
import { Project } from "../../../model";
import { SourceConfig } from "../types";
import { type RlProjectInfo } from "./type";

export const generateRlUrl = (project: RlProjectInfo) => {
  return `/project/${project.id}`;
};

export const manageProjectRemovals = async (
  newList: RlProjectInfo[] | null,
  sourceConfig: SourceConfig,
  round: number // Pass the current round
) => {
  if (newList === null) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Failed to manage project removals. New list is null.`
    );
    return;
  }
  try {
    const dataSource = await getDataSource();
    if (!dataSource) {
      console.log(
        `[${new Date().toISOString()}] - ERROR: Failed to remove projects. Data source not found.`
      );
      return;
    }

    const shouldKeepProjects = newList.map((project) =>
      project.prelimResult === "Keep"
        ? `${sourceConfig.source}-${project.id}`
        : null
    );

    console.log("shouldKeepProjects", shouldKeepProjects);

    const existingProjectsIds = await dataSource
      .getRepository(Project)
      .createQueryBuilder("project")
      .select("project.id")
      .where("project.source = :source", { source: sourceConfig.source })
      .andWhere(":round = ANY(project.rfRounds)", { round }) // Only projects in the current round
      .getMany()
      .then((projects) => projects.map((proj) => proj.id));

    console.log("existingProjectsIds", existingProjectsIds);

    const projectIdsToManipulate = existingProjectsIds.filter(
      (id) => !shouldKeepProjects.includes(id)
    );

    console.log("projectIdsToManipulate", projectIdsToManipulate);

    if (projectIdsToManipulate.length === 0) {
      // No projects to Manipulate
      return;
    }

    // Fetch projects to Remove, including their attests
    const projectsToManipulate = await dataSource
      .getRepository(Project)
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.attests", "attests")
      .where("project.id IN (:...ids)", { ids: projectIdsToManipulate })
      .getMany();

    const projectsToRemove: Project[] = [];
    const projectsToMakeUnImported: Project[] = [];

    projectsToManipulate.forEach(async (project) => {
      const updatedRfRounds = (project.rfRounds || []).filter(
        (rfr) => rfr !== round
      );
      if (updatedRfRounds.length > 0) {
        // Update the project with the updated rfRounds
        try {
          await dataSource
            .createQueryBuilder()
            .update(Project)
            .set({ rfRounds: updatedRfRounds })
            .where("id = :id", { id: project.id })
            .execute();

          console.log(
            `[${new Date().toISOString()}] - INFO: Project updated with removed round. Project ID: ${project.id}`
          );
        } catch (updateError: any) {
          console.log(
            `[${new Date().toISOString()}] - ERROR: Failed to update project rfRounds. Project ID: ${project.id}. Error: ${updateError.message}`
          );
        }
      } else {
        if (project.attests.length > 0) {
          projectsToMakeUnImported.push(project);
        } else {
          projectsToRemove.push(project);
        }
      }
    });

    // Remove projects without attests
    if (projectsToRemove.length > 0) {
      projectsToRemove.forEach(async (project) => {
        try {
          await dataSource
            .createQueryBuilder()
            .delete()
            .from(Project)
            .where("id = :id", { id: project.id })
            .execute();

          console.log(
            `[${new Date().toISOString()}] - INFO: Project Deleted. Project ID: ${project.id}`
          );
        } catch (error: any) {
          console.log(
            `[${new Date().toISOString()}] - ERROR: Failed to delete project. Project ID: ${project.id}. Error: ${error.message}`
          );
        }
      });
    }

    // Mark projects without attests as not imported
    if (projectsToMakeUnImported.length > 0) {
      projectsToMakeUnImported.forEach(async (project) => {
        try {
          await dataSource
            .createQueryBuilder()
            .update(Project)
            .set({ imported: false, rfRounds: [round] })
            .where("id = :id", { id: project.id })
            .execute();

          console.log(
            `[${new Date().toISOString()}] - INFO: Project marked as not imported. Project ID: ${project.id}`
          );
        } catch (updateError: any) {
          console.log(
            `[${new Date().toISOString()}] - ERROR: Failed to mark project as not imported. Project ID: ${project.id}. Error: ${updateError.message}`
          );
        }
      });
    }
  } catch (error: any) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Failed to manage project removals. Error: ${error.message}`
    );
  }
};
