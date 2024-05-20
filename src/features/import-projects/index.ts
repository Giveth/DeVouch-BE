import { Project } from "../../model";
import { createEntityManager, getDataSource } from "../../helpers/db";
import { fetchGivethProjects } from "./service";

export const importProjects = async () => {
  try {
    console.log("importing functions,");
    const em = await createEntityManager();
    const exitingProjects = await em.find(Project);
    console.log("exitingProjects", exitingProjects);

    const projects = await fetchGivethProjects();
    console.log("projects", projects);
  } catch (error: any) {
    console.log("error", error.message);
  }
};
