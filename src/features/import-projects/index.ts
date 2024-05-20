import { Project } from "../../model";
import { createEntityManager, getDataSource } from "../../helpers/db";
import { fetchGivethProjects } from "./service";
import { DataSource } from "typeorm";
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
    console.log("Project exists", existingProject);

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

const updateGivethProjects = async () => {
  const projects = await fetchGivethProjects();
  console.log("Giveth Project Length", projects.length);

  const dataSource = await getDataSource();

  for (const project of projects) {
    console.log("Project", project);
    await updateOrCreateProject(dataSource, project);
  }
};

export const importProjects = async () => {
  try {
    console.log("Importing Projects");
    await createEntityManager();
    await updateGivethProjects();
  } catch (error) {
    console.log("Error", error);
  }
};
