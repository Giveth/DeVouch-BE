import { type DataSource } from "typeorm";
import { Project } from "../../model";

export const updateOrCreateProject = async (
  dataSource: DataSource,
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

  const existingProject = await dataSource
    .getRepository(Project)
    .createQueryBuilder("project")
    .where("project.id = :id", { id: `${source}-${project[idField]}` })
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
      });

      await dataSource
        .createQueryBuilder()
        .update(Project)
        .set(updatedProject)
        .where("id = :id", { id: `${source}-${project[idField]}` })
        .execute();
    }
  } else {
    const newProject = new Project({
      id: `${source}-${project[idField]}`,
      title: project[titleField],
      description: project[descriptionField],
      image: project[imageField],
      slug: project[slugField],
      projectId: project[idField],
      source: source,
      totalVouches: 0,
      totalFlags: 0,
      totalAttests: 0,
      lastUpdatedTimestamp: new Date(),
    });

    await dataSource
      .createQueryBuilder()
      .insert()
      .into(Project)
      .values([newProject])
      .execute();
  }
};
