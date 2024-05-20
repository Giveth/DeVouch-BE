import { Project } from "../../model";
import { getDataSource } from "../../helpers/db";
import { fetchGivethProjectsBatch } from "./service";
import { DataSource } from "typeorm";
import { GivethProjectInfo } from "./type";

const updateOrCreateProject = async (
  dataSource: DataSource,
  projectInfo: GivethProjectInfo
) => {
  const projectSource = "giveth";
  const projectId = projectInfo.id;
  const projectKey = `${projectSource}-${projectId}`;
  const repository = dataSource.getRepository(Project);

  let project = await repository.findOneBy({ id: projectKey });

  if (!project) {
    project = new Project({
      id: projectId,
      source: projectSource,
      projectId,
      totalVouches: 0,
      totalFlags: 0,
      totalAttests: 0,
    });
  }
  if (true) {
    const isUpdated =
      project.title !== projectInfo.title ||
      project.description !== projectInfo.descriptionSummary ||
      project.slug !== projectInfo.slug ||
      project.image !== projectInfo.image;

    if (isUpdated) {
      project.title = projectInfo.title;
      project.description = projectInfo.descriptionSummary;
      project.image = projectInfo.image;
      project.slug = projectInfo.slug;
      project.lastUpdatedTimestamp = new Date();

      await repository.save(project);
    }
  }
};

const processProjectsBatch = async (projectsBatch: GivethProjectInfo[]) => {
  const dataSource = await getDataSource();
  for (const project of projectsBatch) {
    console.log("Processing Project: Giveth", project.id);
    await updateOrCreateProject(dataSource, project);
  }
};

export const fetchAndProcessGivethProjects = async () => {
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
