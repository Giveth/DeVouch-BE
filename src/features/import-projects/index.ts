import { Project } from "../../model";
import { createEntityManager, getDataSource } from "../../helpers/db";
import { fetchGivethProjects } from "./service";
import { type EntityManager } from "typeorm";

const updateGivethProject = async () => {
  const projects = await fetchGivethProjects();
  console.log("Giveth Project Length", projects.Length);
  for (const project of projects) {
    console.log("Project", project);
    const dataSource = await getDataSource();
    const exitingProject = await dataSource
      .getRepository(Project)
      .createQueryBuilder("project")
      .where("project.id = :id", { id: `giveth-${project.id}` })
      .getOne();
    if (exitingProject) {
      console.log("Project exists", exitingProject);
      if (
        exitingProject?.title === project.title &&
        exitingProject?.description === project.descriptionSummary &&
        exitingProject?.slug === project.slug &&
        exitingProject?.image === project.image
      ) {
        continue;
      }
      const updatedProject = new Project({
        ...exitingProject,
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
  }
};

export const importProjects = async () => {
  try {
    console.log("Importing Projects");
    const em = await createEntityManager();
    await updateGivethProject();
  } catch (error: any) {
    console.log("error", error);
  }
};
