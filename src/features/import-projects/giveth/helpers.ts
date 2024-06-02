import { DataSource } from "typeorm";
import { getDataSource } from "../../../helpers/db";
import { Project } from "../../../model";
import { fetchGivethProjectsBatch } from "./service";
import { GivethProjectInfo } from "./type";

const updateOrCreateProject = async (
  dataSource: DataSource,
  project: GivethProjectInfo
) => {
  const existingProject = await dataSource
    .getRepository(Project)
    .createQueryBuilder("project")
    .where("project.id = :id", { id: `giveth-${project.id}` })
    .getOne();

  if (existingProject) {
    const isUpdated =
      existingProject.title !== project.title ||
      existingProject.description !== project.descriptionSummary ||
      existingProject.slug !== project.slug ||
      existingProject.image !== project.image;

    if (isUpdated) {
      const updatedProject = new Project({
        ...existingProject,
        title: project.title,
        description: project.descriptionSummary,
        image: project.image,
        slug: project.slug,
        lastUpdatedTimestamp: new Date(),
      });

      await dataSource
        .createQueryBuilder()
        .update(Project)
        .set(updatedProject)
        .where("id = :id", { id: `giveth-${project.id}` })
        .execute();
    }
  } else {
    const newProject = new Project({
      id: `giveth-${project.id}`,
      title: project.title,
      description: project.descriptionSummary,
      image: project.image,
      slug: project.slug,
      projectId: project.id,
      source: "giveth",
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

export const processProjectsBatch = async (
  projectsBatch: GivethProjectInfo[]
) => {
  const dataSource = await getDataSource();
  if (!dataSource) return;
  for (const project of projectsBatch) {
    console.log("Processing Project: Giveth", project.id);
    await updateOrCreateProject(dataSource, project);
  }
};
