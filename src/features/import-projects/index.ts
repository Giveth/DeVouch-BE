import cron from "node-cron";
import { IMPORT_PROJECT_CRON_SCHEDULE } from "../../constants";
import { fetchAndProcessGivethProjects } from "./giveth/index";
// import { fetchAndProcessRpgf3Projects } from "./rpgf";
import { fetchAndProcessGitcoinProjects } from "./gitcoin";
import { fetchRFProjectsByRound } from "./rf";
import { fetchAndProcessRlProjects } from "./retroList";
import { fetchAndProcessGardensProjects } from "./gardens";
import { ImportResult } from "./types";
import { addTally, emptyTally, inspected } from "./helpers";

export const task = async (): Promise<ImportResult[]> => {
  console.log("Importing Projects", new Date());

  // Every source reports a result rather than throwing, so one failing source
  // does not stop the others - but the run as a whole can still be judged.
  const results: ImportResult[] = [];
  results.push(await fetchAndProcessGivethProjects());
  results.push(await fetchAndProcessGitcoinProjects());
  // results.push(await fetchAndProcessRpgf3Projects());
  results.push(await fetchRFProjectsByRound(4));
  // results.push(await fetchRFProjectsByRound(5)); //TODO: It will fill on 20th Sep
  results.push(await fetchAndProcessRlProjects(5));
  // results.push(await fetchAndProcessRlProjects(6)); // link is not working
  results.push(await fetchAndProcessGardensProjects());

  const totals = results.reduce(
    (acc, result) => addTally(acc, result),
    emptyTally()
  );
  const failed = results.filter((result) => !result.ok);

  // Single machine-parseable line so log-based alerting can key off `ok` and the
  // per-source counts without scraping prose. Note this is deliberately not a
  // non-zero exit: `task()` runs inside the long-lived processor, so exiting
  // would stop indexing over a failed project import.
  console.log(
    `IMPORT_SUMMARY ${JSON.stringify({
      ok: failed.length === 0,
      inspected: inspected(totals),
      ...totals,
      sources: results.map(
        ({
          source,
          ok,
          written,
          unchanged,
          skipped,
          failed: f,
          deactivated,
          error,
          note,
        }) => ({
          source,
          ok,
          written,
          unchanged,
          skipped,
          failed: f,
          // Only reported by sources that reconcile against a complete
          // catalog, so a missing key is "did not reconcile", not "hid
          // nothing".
          ...(deactivated === undefined ? {} : { deactivated }),
          ...(error ? { error } : {}),
          ...(note ? { note } : {}),
        })
      ),
    })}`
  );

  if (failed.length > 0) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Project import finished with ${
        failed.length
      } failed source(s): ${failed
        .map((result) => `${result.source} (${result.error})`)
        .join("; ")}`
    );
  } else {
    console.log(
      `Project import finished: all ${results.length} sources completed, ${inspected(totals)} projects inspected, ${totals.written} written`
    );
  }

  return results;
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
