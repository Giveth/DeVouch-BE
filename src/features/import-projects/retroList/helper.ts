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
    throw new Error(
      "Failed to manage project removals: new list is null - reconciliation did not run"
    );
  }

  // Each bulk step is attempted even if an earlier one failed, so a single bad
  // step does not block the rest of the reconciliation. Failures are collected
  // and thrown together at the end: resolving normally here would let the
  // caller's finishImport report ok:true after incomplete reconciliation.
  const failures: string[] = [];
  try {
    const dataSource = await getDataSource();
    if (!dataSource) {
      throw new Error(
        "Failed to remove projects: data source not found - reconciliation did not run"
      );
    }

    const shouldKeepProjects = newList
      .filter((project) => project.prelimResult === "Keep")
      .map((project) => `${sourceConfig.source}-${project.id}`);

    const existingProjectsIds = await dataSource
      .getRepository(Project)
      .createQueryBuilder("project")
      .select("project.id")
      .where("project.source = :source", { source: sourceConfig.source })
      .andWhere(":round = ANY(project.rfRounds)", { round }) // Only projects in the current round
      .getMany()
      .then((projects) => projects.map((proj) => proj.id));

    const projectIdsToManipulate = existingProjectsIds.filter(
      (id) => !shouldKeepProjects.includes(id)
    );

    if (projectIdsToManipulate.length === 0) {
      // No projects to Manipulate
      console.log(
        `[${new Date().toISOString()}] - INFO: No projects to Manipulate - ${round} - retroList`
      );
      return;
    }

    // Fetch projects to Remove, including their attests
    const projectsToManipulate = await dataSource
      .getRepository(Project)
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.attests", "attests")
      .where("project.id IN (:...ids)", { ids: projectIdsToManipulate })
      .getMany();

    const projectsToUpdateRfRounds: Array<{
      id: string;
      updatedRfRounds: number[];
    }> = [];
    const projectsToRemove: Project[] = [];
    const projectsToMakeUnImported: Project[] = [];

    for (const project of projectsToManipulate) {
      const updatedRfRounds = (project.rfRounds || []).filter(
        (rfr) => rfr !== round
      );
      if (updatedRfRounds.length > 0) {
        // Collect projects to update
        projectsToUpdateRfRounds.push({ id: project.id, updatedRfRounds });
      } else {
        if (project.attests.length > 0) {
          projectsToMakeUnImported.push(project);
        } else {
          projectsToRemove.push(project);
        }
      }
    }

    const updateRfRoundsPromises = projectsToUpdateRfRounds.map(
      async ({ id, updatedRfRounds }) => {
        try {
          await dataSource
            .createQueryBuilder()
            .update(Project)
            .set({ rfRounds: updatedRfRounds })
            .where("id = :id", { id })
            .execute();
          console.log(
            `[INFO]: Project updated with removed round. Project ID: ${id}`
          );
        } catch (updateError: any) {
          console.log(
            `[ERROR]: Failed to update project rfRounds. Project ID: ${id}. Error: ${updateError.message}`
          );
          throw updateError; // Re-throw to let Promise.all handle it
        }
      }
    );
    try {
      await Promise.all(updateRfRoundsPromises);
    } catch (error: any) {
      console.log(
        `[ERROR]: One or more updates failed. Error: ${error.message}`
      );
      failures.push(`rfRounds update: ${error.message}`);
    }

    // Bulk delete projects without attests
    if (projectsToRemove.length > 0) {
      const projectIdsToDelete = projectsToRemove.map((project) => project.id);
      try {
        await dataSource
          .createQueryBuilder()
          .delete()
          .from(Project)
          .where("id IN (:...ids)", { ids: projectIdsToDelete })
          .execute();

        console.log(
          `[${new Date().toISOString()}] - INFO: Projects Deleted. Project IDs: ${projectIdsToDelete.join(
            ", "
          )}`
        );
      } catch (error: any) {
        console.log(
          `[${new Date().toISOString()}] - ERROR: Failed to delete projects. Project IDs: ${projectIdsToDelete.join(
            ", "
          )}. Error: ${error.message}`
        );
        failures.push(
          `delete of ${projectIdsToDelete.length} project(s): ${error.message}`
        );
      }
    }

    // Bulk update projects with attests to mark as not imported
    if (projectsToMakeUnImported.length > 0) {
      const projectIdsToMakeUnImported = projectsToMakeUnImported.map(
        (project) => project.id
      );
      try {
        await dataSource
          .createQueryBuilder()
          .update(Project)
          .set({ imported: false, rfRounds: [round] })
          .where("id IN (:...ids)", { ids: projectIdsToMakeUnImported })
          .execute();

        console.log(
          `[${new Date().toISOString()}] - INFO: Projects marked as not imported. Project IDs: ${projectIdsToMakeUnImported.join(
            ", "
          )}`
        );
      } catch (error: any) {
        console.log(
          `[${new Date().toISOString()}] - ERROR: Failed to mark projects as not imported. Project IDs: ${projectIdsToMakeUnImported.join(
            ", "
          )}. Error: ${error.message}`
        );
        failures.push(
          `mark ${projectIdsToMakeUnImported.length} project(s) unimported: ${error.message}`
        );
      }
    }
  } catch (error: any) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Failed to manage project removals. Error: ${error.message}`
    );
    throw error;
  }

  if (failures.length > 0) {
    throw new Error(
      `Project removal reconciliation incomplete: ${failures.join("; ")}`
    );
  }
};
