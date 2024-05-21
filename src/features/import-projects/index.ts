import cron from "node-cron";
import { fetchAndProcessGivethProjects } from "./giveth/helpers";

const task = async () => {
  console.log("Importing Projects", new Date());
  await fetchAndProcessGivethProjects();
};

export const importProjects = async () => {
  try {
    console.log("Importing Projects has been scheduled.");
    cron.schedule("0 0 * * *", task, {
      scheduled: true,
      timezone: "UTC",
    });
  } catch (error) {
    console.log("Error", error);
  }
};
