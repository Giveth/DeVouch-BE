import cron from "node-cron";
import { IMPORT_PROJECT_CRON_SCHEDULE } from "../../constants";
import { fetchAndProcessGivethProjects } from "./giveth/index";
import { fetchAndProcessRpgf3Projects } from "./rpgf";

export const task = async () => {
  console.log("Importing Projects", new Date());
  await fetchAndProcessGivethProjects();
  await fetchAndProcessRpgf3Projects();
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
    console.log("Error on scheduling importing project:", error);
  }
};
