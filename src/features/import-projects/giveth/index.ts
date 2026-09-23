import {
  GIVETH_API_LIMIT,
  givethCatalogConfig,
  givethSourceConfig,
} from "./constants";
import { processProjectsBatch } from "./helpers";
import { fetchGivethCatalogBatch } from "./service";
import { nextCatalogCursor } from "./cursor";
import { deactivateProjectsMissingFromCatalog } from "./reconcile";
import { ImportResult, ImportTally } from "../types";
import {
  abortImport,
  addTally,
  emptyTally,
  finishImport,
  projectRowId,
  skipImport,
} from "../helpers";

export const fetchAndProcessGivethProjects =
  async (): Promise<ImportResult> => {
    const tally: ImportTally = emptyTally();
    try {
      // Resolved once per run: a partially configured trio or a V5 URL throws
      // here and aborts before any request is sent.
      const config = givethCatalogConfig();
      if (!config) {
        return skipImport(
          "giveth",
          "GIVETH_API_URL, GIVETH_API_USERNAME and GIVETH_API_PASSWORD are not set"
        );
      }

      let hasMoreProjects = true;
      // Keyset cursor: the catalog returns projects with id > afterId, and an
      // empty page means the walk is complete.
      let afterId = 0;
      // Every id the catalog served this run. The catalog carries only ACTIVE
      // projects (#189), so a stored Giveth project missing from the COMPLETE
      // set has been deactivated or cancelled upstream (#190).
      const catalogProjectIds = new Set<string>();
      // The catalog's own count of ACTIVE projects, asked for once - on the
      // first request - because upstream resolves it lazily with a COUNT over
      // the whole table, off the read replica rather than the primary the page
      // comes from. It is an estimate taken at the start of the walk, used
      // only to catch a walk that ended far too early.
      let catalogTotal: number | null = null;
      let isFirstPage = true;

      while (hasMoreProjects) {
        const { projects: projectsBatch, total } =
          await fetchGivethCatalogBatch(config, GIVETH_API_LIMIT, afterId, {
            withTotal: isFirstPage,
          });
        if (isFirstPage) {
          catalogTotal = total;
          isFirstPage = false;
        }
        if (projectsBatch.length > 0) {
          for (const project of projectsBatch) {
            catalogProjectIds.add(
              projectRowId(givethSourceConfig.source, project.id)
            );
          }
          // `updateOrCreateProject` logs persistence failures instead of
          // throwing, so failures have to be counted rather than caught. The
          // tally keeps writes, unchanged rows and failures apart: a run that
          // inspected everything and wrote nothing is not a complete import.
          addTally(tally, await processProjectsBatch(projectsBatch));
          afterId = nextCatalogCursor(projectsBatch, afterId);
        } else {
          hasMoreProjects = false;
        }
      }

      // Reached only by a COMPLETE walk: every page was served, every page was
      // ordered and advanced the cursor, and the loop ended on an empty page.
      // Any request error, GraphQL error, malformed page or cursor violation
      // throws above and lands in `abortImport` with this line unreached, so no
      // project can ever be hidden on the strength of a partial catalog.
      //
      // A per-project write failure above does not block reconciliation: it
      // does not shrink the id set (the project is still in the catalog and so
      // still protected), and the run is reported as failed by `finishImport`
      // regardless.
      // `catalogTotal` is an additional cross-check, not a substitute for the
      // per-run deactivation ceiling: it refuses a walk that ended early, the
      // ceiling refuses a stale set too large to be upstream churn, and both
      // are enforced before a single row is touched.
      const deactivated = await deactivateProjectsMissingFromCatalog(
        givethSourceConfig.source,
        catalogProjectIds,
        { catalogTotal }
      );

      return finishImport("giveth", tally, { deactivated: deactivated.length });
    } catch (error: any) {
      return abortImport("giveth", tally, error);
    }
  };
