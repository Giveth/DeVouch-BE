import { type DataSource } from "typeorm";
import { Project } from "../../model";
import { getDataSource } from "../../helpers/db";
import { DESCRIPTION_SUMMARY_LENGTH } from "../../constants";
import { convert } from "html-to-text";
import { SourceConfig } from "./types";

const areTimestampsEqual = (
  timestamp1: Date | null | undefined,
  timestamp2: Date | null | undefined
) => {
  if (!timestamp1 || !timestamp2) {
    return timestamp1 == timestamp2; // Handles the case where one or both are null/undefined
  }
  return new Date(timestamp1).getTime() === new Date(timestamp2).getTime();
};

const areValuesEqual = (
  value1: string | null | undefined,
  value2: string | null | undefined
) => {
  return value1 == value2; // Handles null, undefined, and string comparisons
};

export const updateOrCreateProject = async (
  project: any,
  sourceConfig: SourceConfig
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
    sourceCreatedAtField,
  } = sourceConfig;

  const projectId = project[idField].toLowerCase();
  const id = `${source}-${projectId}`;

  const dataSource = await getDataSource();
  if (!dataSource) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Failed to UPSERT project. Data source not found. Project ID: ${id}`
    );
    return;
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
  const sourceCreatedAt = sourceCreatedAtField && project[sourceCreatedAtField];

  // Skip project if prelimResult is "Remove"
  if (prelimResult && project[prelimResult] === "Remove") {
    return;
  }

  const descriptionSummary = getHtmlTextSummary(descriptionHtml || description);

  if (existingProject) {
    const changes: string[] = [];

    // Check for specific field changes and log them
    if (existingProject.title !== title)
      changes.push(`title: "${existingProject.title}" -> "${title}"`);
    if (existingProject.description !== description)
      changes.push(
        `description: "${existingProject.description}" -> "${description}"`
      );
    if (existingProject.url !== url)
      changes.push(`url: "${existingProject.url}" -> "${url}"`);
    if (existingProject.image !== image)
      changes.push(`image: "${existingProject.image}" -> "${image}"`);
    if (!areValuesEqual(existingProject.descriptionHtml, descriptionHtml))
      changes.push(`descriptionHtml changed`);
    if (!existingProject.descriptionSummary && description)
      changes.push(`descriptionSummary set`);
    if (!areTimestampsEqual(existingProject.sourceCreatedAt, sourceCreatedAt))
      changes.push(
        `sourceCreatedAt: "${existingProject.sourceCreatedAt}" -> "${sourceCreatedAt}"`
      );
    if (rfRound && !existingProject.rfRounds?.some((rfr) => rfr === rfRound)) {
      changes.push(`rfRound added: "${rfRound}"`);
    }

    const isUpdated = changes.length > 0;

    if (isUpdated) {
      // Add the current round to rfRounds if not already present
      const rfRoundsSet = new Set(existingProject.rfRounds || []);
      if (rfRound) {
        rfRoundsSet.add(rfRound);
      }

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
        sourceCreatedAt,
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
          `[${new Date().toISOString()}] - INFO: Project Updated. Project ID: ${id}. Changes: ${changes.join(", ")}`
        );
      } catch (error: any) {
        console.log(
          `[${new Date().toISOString()}] - ERROR: Failed to update project. Project ID: ${id}, Error: ${error.message}`
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
      sourceCreatedAt,
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
    } catch (error: any) {
      console.log(
        `[${new Date().toISOString()}] - ERROR: Failed to create project. Project ID: ${id}, Error: ${error.message}`
      );
    }
  }
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
