import { DataSource } from "typeorm";
import { Project } from "../../../model";
import { Rpgf3ProjectInfo } from "./type";

export const updateOrCreateProject = async (
  dataSource: DataSource,
  project: Rpgf3ProjectInfo
) => {
  const existingProject = await dataSource
    .getRepository(Project)
    .createQueryBuilder("project")
    .where("project.id = :id", { id: `rpgf3-${project.id}` })
    .getOne();

  if (existingProject) {
    const isUpdated =
      existingProject.title !== project.name ||
      existingProject.description !== project.impactDescription ||
      existingProject.slug !== "" ||
      existingProject.image !== project.image;

    if (isUpdated) {
      const updatedProject = new Project({
        ...existingProject,
        title: project.name,
        description: project.impactDescription,
        image: project.image,
        slug: "",
        lastUpdatedTimestamp: new Date(),
      });

      await dataSource
        .createQueryBuilder()
        .update(Project)
        .set(updatedProject)
        .where("id = :id", { id: `rpgf3-${project.id}` })
        .execute();

      console.log(`Updated project:rpgf3-${project.id}`);
    }
  } else {
    const newProject = new Project({
      id: `rpgf3-${project.id}`,
      title: project.name,
      description: project.impactDescription,
      image: project.image,
      slug: "",
      projectId: project.id,
      source: "rpgf3",
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
  console.log(`Created project: rpgf3-${project.id}`);
};
