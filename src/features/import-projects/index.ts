import cron from "node-cron";
import { fetchAndProcessGivethProjects } from "./giveth/helpers";
import { IMPORT_PROJECT_CRON_SCHEDULE } from "../../constants";

export const task = async () => {
  console.log("Importing Projects", new Date());
  await fetchAndProcessGivethProjects();
};

export const importProjects = async () => {
  try {
    console.log(
      `Importing Projects scheduling ${IMPORT_PROJECT_CRON_SCHEDULE}.`
    );
    cron.schedule(IMPORT_PROJECT_CRON_SCHEDULE, task, {
      scheduled: true,
      timezone: "UTC",
    });
  } catch (error) {
    console.log("Error", error);
  }
};
