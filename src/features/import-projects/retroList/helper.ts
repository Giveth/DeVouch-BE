import { getDataSource } from "../../../helpers/db";
import { Project } from "../../../model";
import { SourceConfig } from "../types";
import { type RlProjectInfo } from "./type";

export const generateRlUrl = (project: RlProjectInfo) => {
  return `/project/${project.id}`;
};

export const removeNonExistingProjects = async (
  processedProjectIds: string[],
  sourConfig: SourceConfig,
  round: number // Pass the current round
) => {
  const { source } = sourConfig;
  const dataSource = await getDataSource();
  if (!dataSource) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Failed to remove projects. Data source not found.`
    );
    return;
  }

  // Step 1: Fetch existing projects for the source and current round
  const existingProjectIds = await dataSource
    .getRepository(Project)
    .createQueryBuilder("project")
    .select("project.id")
    .where("project.source = :source", { source })
    .andWhere(":round = ANY(project.rfRounds)", { round }) // Only projects in the current round
    .getMany()
    .then((projects) => projects.map((proj) => proj.id));

  // Step 2: Identify projects to update (those not processed in the current round)
  const projectIdsToUpdate = existingProjectIds.filter(
    (id) => !processedProjectIds.includes(id)
  );

  if (projectIdsToUpdate.length === 0) {
    // No projects to update
    return;
  }

  // Step 3: Fetch projects to update, including their attests
  const projectsToUpdate = await dataSource
    .getRepository(Project)
    .createQueryBuilder("project")
    .leftJoinAndSelect("project.attests", "attests")
    .where("project.id IN (:...ids)", { ids: projectIdsToUpdate })
    .getMany();

  // Step 4: Process each project individually
  for (const project of projectsToUpdate) {
    const updatedRfRounds = (project.rfRounds || []).filter(
      (rfr) => rfr !== round
    );

    if (updatedRfRounds.length === 0) {
      // No rounds remain after removing the current round
      if (project.imported) {
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
          // Mark project as not imported if failed to delete
          console.log(
            `[${new Date().toISOString()}] - ERROR: Failed to delete project. Project ID: ${project.id}. Error: ${error.message}`
          );
          try {
            await dataSource
              .createQueryBuilder()
              .update(Project)
              .set({ imported: false, rfRounds: updatedRfRounds })
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
        }
      }
    } else {
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
    }
  }
};
