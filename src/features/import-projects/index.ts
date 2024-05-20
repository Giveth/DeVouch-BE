import { fetchAndProcessGivethProjects } from "./giveth/helpers";

export const importProjects = async () => {
  try {
    console.log("Importing Projects");
    await fetchAndProcessGivethProjects();
  } catch (error) {
    console.log("Error", error);
  }
};
