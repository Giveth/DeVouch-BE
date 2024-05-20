import { Project } from "../../model";
import { getDataSource } from "../../helpers/db";
import { fetchGivethProjectsBatch } from "./service";
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

const processProjectsBatch = async (projectsBatch: GivethProjectInfo[]) => {
  const dataSource = await getDataSource();
  for (const project of projectsBatch) {
    console.log("Processing Project: Giveth", project.id);
    await updateOrCreateProject(dataSource, project);
  }
};

const fetchAndProcessGivethProjects = async () => {
  try {
    let hasMoreProjects = true;
    let skip = 0;
    const limit = 10;

    while (hasMoreProjects) {
      const projectsBatch = await fetchGivethProjectsBatch(limit, skip);
      if (projectsBatch.length > 0) {
        await processProjectsBatch(projectsBatch);
        skip += limit;
      } else {
        hasMoreProjects = false;
      }
    }
  } catch (error: any) {
    console.log("error on fetching giveth projects", error.message);
  }
};

export const importProjects = async () => {
  try {
    console.log("Importing Projects");
    await fetchAndProcessGivethProjects();
  } catch (error) {
    console.log("Error", error);
  }
};
