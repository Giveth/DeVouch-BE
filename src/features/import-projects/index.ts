import cron from "node-cron";
import { fetchAndProcessGivethProjects } from "./giveth/helpers";
import { CRON_SCHEDULE } from "./config";

export const task = async () => {
  console.log("Importing Projects", new Date());
  await fetchAndProcessGivethProjects();
};

export const importProjects = async () => {
  try {
    console.log("Importing Projects has been scheduled.");
    cron.schedule(CRON_SCHEDULE, task, {
      scheduled: true,
      timezone: "UTC",
    });
  } catch (error) {
    console.log("Error", error);
  }
};
