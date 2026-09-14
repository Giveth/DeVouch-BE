import cron from "node-cron";
import { ImportResult } from "./types";
import { IMPORT_PROJECT_CRON_SCHEDULE } from "../../constants";
import { fetchAndProcessGivethProjects } from "./giveth/index";
// import { fetchAndProcessRpgf3Projects } from "./rpgf";
import { fetchAndProcessGitcoinProjects } from "./gitcoin";
import { fetchRFProjectsByRound } from "./rf";
import { fetchAndProcessRlProjects } from "./retroList";
import { fetchAndProcessGardensProjects } from "./gardens";
export const task = async () => {
  console.log("Importing Projects", new Date());
  // Importers that report a result are collected so a failed source is visible
  // to the caller, not only to a human reading container logs. Failures are not
  // rethrown: the remaining sources should still run. Every other importer
  // still swallows its failures and returns nothing, so the summary below names
  // the sources it actually covers rather than implying an all-clear.
  const results: ImportResult[] = [];
  results.push(await fetchAndProcessGivethProjects());
  await fetchAndProcessGitcoinProjects();
  // fetchAndProcessRpgf3Projects();
  await fetchRFProjectsByRound(4);
  // await fetchRFProjectsByRound(5); //TODO: It will fill on 20th Sep
  await fetchAndProcessRlProjects(5);
  // await fetchAndProcessRlProjects(6); // link is not working
  await fetchAndProcessGardensProjects();

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.log(
      `Project import finished with ${failed.length} failed source(s): ${failed
        .map((result) => `${result.source} (${result.error})`)
        .join("; ")}`
    );
  } else {
    console.log(
      `Project import finished: ${results
        .map((result) => result.source)
        .join(", ")} completed (other sources do not report status)`
    );
  }
};

export const importProjects = async () => {
  try {
    console.log(
      `Importing Projects scheduling ${IMPORT_PROJECT_CRON_SCHEDULE}.`
    );
    cron.schedule(IMPORT_PROJECT_CRON_SCHEDULE, task, {
      timezone: "UTC",
    });
    task();
  } catch (error) {
    console.log("Error on scheduling importing project:", error);
  }
};
