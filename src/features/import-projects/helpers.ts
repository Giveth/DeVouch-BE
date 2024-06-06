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
    slugField,
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

  if (existingProject) {
    const isUpdated =
      existingProject.title !== project[titleField] ||
      existingProject.description !== project[descriptionField] ||
      existingProject.slug !== project[slugField] ||
      existingProject.image !== project[imageField];

    if (isUpdated) {
      const updatedProject = new Project({
        ...existingProject,
        title: project[titleField],
        description: project[descriptionField],
        image: project[imageField],
        slug: project[slugField],
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
      title: project[titleField],
      description: project[descriptionField],
      image: project[imageField],
      slug: project[slugField],
      projectId: projectId,
      source: source,
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
