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
  } = sourConfig;

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

  if (existingProject) {
    const isUpdated =
      existingProject.title !== title ||
      existingProject.description !== description ||
      existingProject.url !== url ||
      existingProject.image !== image ||
      (rfRound && !existingProject.rfRounds?.some((rfr) => rfr === rfRound)) ||
      existingProject.descriptionHtml !== descriptionHtml ||
      (!existingProject.descriptionSummary && description);

    const descriptionSummary = getHtmlTextSummary(
      descriptionHtml || description
    );

    if (isUpdated) {
      const rfRounds = new Set(existingProject.rfRounds || []);
      rfRound && rfRounds.add(rfRound);
      const updatedProject = new Project({
        ...existingProject,
        title,
        description,
        image,
        url,
        descriptionHtml,
        descriptionSummary,
        lastUpdatedTimestamp: new Date(),
        rfRounds: Array.from(rfRounds),
        imported: true,
      });

      await dataSource
        .createQueryBuilder()
        .update(Project)
        .set(updatedProject)
        .where("id = :id", { id })
        .execute();

      console.log(
        `[${new Date().toISOString()}] - INFO: Project Updated. Project ID: ${id}`
      );
    }
  } else {
    const descriptionSummary = getHtmlTextSummary(
      descriptionHtml || description
    );
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

    await dataSource
      .createQueryBuilder()
      .insert()
      .into(Project)
      .values([newProject])
      .execute();

    console.log(
      `[${new Date().toISOString()}] - INFO: Project Created. Project ID: ${id}`
    );
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
