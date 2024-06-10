import { type DataSource } from "typeorm";
import { Project } from "../../model";
import { getDataSource } from "../../helpers/db";

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

  if (existingProject) {
    const isUpdated =
      existingProject.title !== title ||
      existingProject.description !== description ||
      existingProject.url !== url ||
      existingProject.image !== image ||
      existingProject.descriptionHtml !== descriptionHtml;

    if (isUpdated) {
      const updatedProject = new Project({
        ...existingProject,
        title,
        description,
        image,
        url,
        descriptionHtml,
        lastUpdatedTimestamp: new Date(),
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
    const newProject = new Project({
      id,
      title,
      description,
      image,
      url,
      descriptionHtml,
      projectId,
      source,
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
