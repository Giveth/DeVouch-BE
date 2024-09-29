import { type DataSource } from "typeorm";
import { Project } from "../../model";
import { getDataSource } from "../../helpers/db";
import { DESCRIPTION_SUMMARY_LENGTH } from "../../constants";
import { convert } from "html-to-text";
import { SourceConfig } from "./types";

export const updateOrCreateProject = async (
  project: any,
  sourConfig: SourceConfig
) => {
  const {
    source,
    idField,
    titleField,
    descriptionField,
    descriptionHtmlField,
    urlField,
    imageField,
    rfRoundField,
    prelimResult,
  } = sourConfig;

  const projectId = project[idField].toLowerCase();
  const id = `${source}-${projectId}`;

  const dataSource = await getDataSource();
  if (!dataSource) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Failed to UPSERT project. Data source not found. Project ID: ${id}`
    );
    return id;
  }

  const existingProject = await dataSource
    .getRepository(Project)
    .createQueryBuilder("project")
    .where("project.id = :id", { id })
    .getOne();

  const title = project[titleField];
  const description = project[descriptionField];
  const url = project[urlField];
  const image = project[imageField];
  const descriptionHtml = descriptionHtmlField && project[descriptionHtmlField];
  const rfRound = rfRoundField && project[rfRoundField];

  // Remove project if prelimResult is "Remove"
  if (prelimResult && project[prelimResult] === "Remove") {
    if (existingProject) {
      // Remove the current round from rfRounds
      const updatedRfRounds = (existingProject.rfRounds || []).filter(
        (rfr) => rfr !== rfRound
      );

      if (updatedRfRounds.length === 0) {
        // If no rounds remain, delete the project
        if (existingProject.imported) {
          try {
            await dataSource
              .createQueryBuilder()
              .delete()
              .from(Project)
              .where("id = :id", { id })
              .execute();

            console.log(
              `[${new Date().toISOString()}] - INFO: Project Deleted. Project ID: ${id}`
            );
          } catch (error) {
            // Mark project as not imported if failed to delete
            console.log(
              `[${new Date().toISOString()}] - ERROR: Failed to delete project. Project ID: ${id}, Error: ${error.message}`
            );
            try {
              await dataSource
                .createQueryBuilder()
                .update(Project)
                .set({ imported: false, rfRounds: updatedRfRounds })
                .where("id = :id", { id })
                .execute();

              console.log(
                `[${new Date().toISOString()}] - INFO: Project marked as not imported. Project ID: ${id}`
              );
            } catch (updateError) {
              console.log(
                `[${new Date().toISOString()}] - ERROR: Failed to mark project as not imported. Project ID: ${id}`
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
            .where("id = :id", { id })
            .execute();

          console.log(
            `[${new Date().toISOString()}] - INFO: Project updated with removed round. Project ID: ${id}`
          );
        } catch (updateError) {
          console.log(
            `[${new Date().toISOString()}] - ERROR: Failed to update project rfRounds. Project ID: ${id}`
          );
        }
      }
    }
    // If the project does not exist, nothing to do
    return id;
  }

  const descriptionSummary = getHtmlTextSummary(descriptionHtml || description);

  if (existingProject) {
    // Update existing project
    const isUpdated =
      existingProject.title !== title ||
      existingProject.description !== description ||
      existingProject.url !== url ||
      existingProject.image !== image ||
      existingProject.descriptionHtml !== descriptionHtml ||
      (!existingProject.descriptionSummary && description);

    // Add the current round to rfRounds if not already present
    const rfRoundsSet = new Set(existingProject.rfRounds || []);
    if (rfRound) {
      rfRoundsSet.add(rfRound);
    }

    if (
      isUpdated ||
      rfRoundsSet.size !== (existingProject.rfRounds || []).length
    ) {
      const updatedProject = {
        ...existingProject,
        title,
        description,
        image,
        url,
        descriptionHtml,
        descriptionSummary,
        lastUpdatedTimestamp: new Date(),
        rfRounds: Array.from(rfRoundsSet),
        imported: true,
      };

      try {
        await dataSource
          .createQueryBuilder()
          .update(Project)
          .set(updatedProject)
          .where("id = :id", { id })
          .execute();

        console.log(
          `[${new Date().toISOString()}] - INFO: Project Updated. Project ID: ${id}`
        );
      } catch (error) {
        console.log(
          `[${new Date().toISOString()}] - ERROR: Failed to update project. Project ID: ${id}`
        );
      }
    }
  } else {
    // Create new project
    const newProject = new Project({
      id,
      title,
      description,
      image,
      url,
      descriptionHtml,
      descriptionSummary,
      projectId,
      source,
      rfRounds: rfRound ? [rfRound] : [],
      totalVouches: 0,
      totalFlags: 0,
      totalAttests: 0,
      lastUpdatedTimestamp: new Date(),
      imported: true,
    });

    try {
      await dataSource
        .createQueryBuilder()
        .insert()
        .into(Project)
        .values([newProject])
        .execute();

      console.log(
        `[${new Date().toISOString()}] - INFO: Project Created. Project ID: ${id}`
      );
    } catch (error) {
      console.log(
        `[${new Date().toISOString()}] - ERROR: Failed to create project. Project ID: ${id}`
      );
    }
  }

  return id;
};

const getHtmlTextSummary = (
  html: string = "",
  lengthLimit: number = DESCRIPTION_SUMMARY_LENGTH
): string => {
  const text = convert(html, {
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  })
    .replace(/^\n+/, "") // Remove new lines from the beginning
    .replace(/\n{2,}/g, "\n") // Replace multiple \n with single one
    .replace(/\n$/, ""); // Remove new line from the end

  switch (true) {
    case text.length <= lengthLimit:
      return text;
    case lengthLimit < 3:
      return ".".repeat(Math.max(0, lengthLimit));
    default:
      return text.slice(0, lengthLimit - 3) + "...";
  }
};
