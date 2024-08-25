import cron from "node-cron";
import { IMPORT_PROJECT_CRON_SCHEDULE } from "../../constants";
import { fetchAndProcessGivethProjects } from "./giveth/index";
import { fetchAndProcessRpgf3Projects } from "./rpgf";
import { fetchAndProcessGitcoinProjects } from "./gitcoin";
import { fetchRFProjectsByRound } from "./rf";

export const task = async () => {
  console.log("Importing Projects", new Date());
  await fetchAndProcessGivethProjects();
  await fetchAndProcessGitcoinProjects();
  // fetchAndProcessRpgf3Projects();
  await fetchRFProjectsByRound(4);
  await fetchRFProjectsByRound(5);
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
    task();
  } catch (error) {
    console.log("Error on scheduling importing project:", error);
  }
};
