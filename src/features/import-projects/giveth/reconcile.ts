import { getDataSource } from "../../../helpers/db";
import { Project } from "../../../model";

// Postgres caps a statement at 65535 bound parameters and the stale set is
// unbounded in principle, so the hide is issued in chunks inside one
// transaction rather than as a single `id IN (...)`.
const DEACTIVATE_CHUNK_SIZE = 500;

// A run only ever has to hide the handful of projects deactivated or cancelled
// upstream since the last one. A stale set larger than this is not a plausible
// amount of upstream churn - it is the signature of a catalog that came back
// SHORT rather than empty (a keyset predicate that stopped matching after the
// first page, a filter that lost most of its rows, a half-rolled-out deploy),
// which the zero-projects check below cannot catch because such a catalog walks
// to completion with real projects in it. Fail closed instead: nothing is
// hidden, the run is reported failed, and a genuine bulk removal is applied by
// raising the ceiling deliberately rather than by an outage.
export const DEFAULT_MAX_DEACTIVATIONS_PER_RUN = 250;

// Read per run rather than at module load: the first import after this ships
// has to clear a backlog nobody has sized yet (#190 AC4), so the ceiling has to
// be raisable for one run by an operator - and reading it here is also what
// lets the tests drive it without reloading the module graph.
//
// Anything that is not a plain positive integer is a typo, not an intent, and
// silently importing with a broken ceiling is worse than importing with the
// default: fall back, and say so in the log so the typo is visible.
export const resolveMaxDeactivationsPerRun = (
  raw: string | undefined = process.env.GIVETH_MAX_DEACTIVATIONS_PER_RUN
): number => {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_MAX_DEACTIVATIONS_PER_RUN;
  }

  const trimmed = raw.trim();
  const parsed = Number(trimmed);
  // The digit test rejects what `Number` would otherwise accept in an env var
  // that is meant to hold a count: "1e3", "0x20", "+250", " -1". The safe
  // integer test then rejects a digit string too large to be counted with.
  if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(parsed) || parsed <= 0) {
    console.log(
      `[${new Date().toISOString()}] - WARN: GIVETH_MAX_DEACTIVATIONS_PER_RUN=${JSON.stringify(
        raw
      )} is not a positive integer - falling back to ${DEFAULT_MAX_DEACTIVATIONS_PER_RUN}`
    );
    return DEFAULT_MAX_DEACTIVATIONS_PER_RUN;
  }

  return parsed;
};

// How far the walk and the catalog-total may disagree, in either direction,
// before the two are no longer describing the same catalog. `total` is a
// per-request COUNT taken off Giveth's read replica while the pages come off
// the primary, so it is an estimate of the catalog size at the start of the
// walk and nothing stronger: projects legitimately activate and deactivate
// while pagination runs, and the replica lags. The absolute floor makes the
// check a deliberate no-op on small catalogs - there the deactivation ceiling
// is the effective guard - and the fraction scales it for large ones. Both are
// far below what real truncation costs (a lost keyset predicate drops most of
// the catalog, not 5% of it).
export const CATALOG_TOTAL_ABSOLUTE_SLACK = 25;
export const CATALOG_TOTAL_SLACK_FRACTION = 0.05;

// Cross-checks the walk against the catalog's own count of ACTIVE projects and
// reports whether the catalog can be considered COMPLETE. Throws on a walk that
// ended far short of the count; returns false - without throwing - when there
// is no count to check against, which is unverified rather than wrong.
//
// A shortfall is the dangerous direction, but an overshoot is only harmless
// while it is SMALL. Walking a few more projects than `total` reports is
// ordinary: the count is taken at the start of the walk and off a lagging
// replica, so a project that went ACTIVE while pagination ran is served by a
// page without ever having been counted. Those projects are exactly what
// reconciliation is for, so a small overshoot must not abort it.
//
// Walking FAR more than the total reports is a different thing: the count is
// not describing this catalog at all (an upstream that reports 0, or counts a
// narrower set than it serves). Letting that pass as confirmation would hand a
// meaningless number the right to unlock the larger deactivation ceiling, so
// such a total is reported as unusable - unverified, exactly like a missing
// one, and for the same reason it is not thrown on: it costs the cross-check,
// not the import.
export const confirmCatalogWalkIsComplete = (
  source: string,
  walkedCount: number,
  catalogTotal: number | null
): boolean => {
  if (catalogTotal === null) {
    // `total` is a lazily resolved optional field upstream. Losing it costs an
    // extra signal, not a safety property: the empty-catalog refusal, the
    // pagination contract and the deactivation ceiling all still apply, and
    // failing the import over a missing optional field would be a worse
    // outcome than reconciling without it.
    console.log(
      `${source} reconciliation: catalog total unavailable, walk completeness unverified`
    );
    return false;
  }

  const slack = Math.max(
    CATALOG_TOTAL_ABSOLUTE_SLACK,
    Math.ceil(catalogTotal * CATALOG_TOTAL_SLACK_FRACTION)
  );

  if (walkedCount >= catalogTotal) {
    const overshoot = walkedCount - catalogTotal;
    if (overshoot <= slack) return true;
    console.log(
      `[${new Date().toISOString()}] - WARN: ${source} reconciliation: the walk collected ${walkedCount} project(s) but the catalog reported ${catalogTotal}, an overshoot of ${overshoot} over the ${slack} tolerated - the total is not describing this catalog, walk completeness unverified`
    );
    return false;
  }

  const shortfall = catalogTotal - walkedCount;
  if (shortfall <= slack) return true;

  throw new Error(
    `Refusing to reconcile ${source} projects: the walk collected ${walkedCount} project(s) but the catalog reported ${catalogTotal} at the start of the run, a shortfall of ${shortfall} over the ${slack} tolerated - a walk that short ended early rather than running out of projects`
  );
};

// What the per-run ceiling means once the walk is CONFIRMED complete against
// the catalog's own count. The fixed ceiling is a proxy for "the catalog may
// have come back short"; when `total` has ruled that out directly, the real
// risk left is hiding a large share of the listings in one go, which is a
// proportion rather than a count. Half is deliberately generous: an import
// that has never hidden anything accumulates a backlog measured in years
// (#190 AC4), and clearing it is the point of the feature - while a run that
// would blank most of the listings is still refused.
export const CONFIRMED_WALK_MAX_DEACTIVATION_FRACTION = 0.5;

// The configured ceiling is a FLOOR, never a cap: an operator who raises
// GIVETH_MAX_DEACTIVATIONS_PER_RUN gets that number in either regime, and a
// confirmed walk is only ever allowed to go higher than an unconfirmed one.
export const resolveDeactivationCeiling = (
  listedCount: number,
  walkConfirmedComplete: boolean
): number => {
  const configured = resolveMaxDeactivationsPerRun();
  if (!walkConfirmedComplete) return configured;
  return Math.max(
    configured,
    Math.ceil(listedCount * CONFIRMED_WALK_MAX_DEACTIVATION_FRACTION)
  );
};

// Hides every project of `source` that the freshly fetched catalog no longer
// lists, by clearing `imported` - the flag the listing queries filter on
// (`project.imported = true`). Nothing is deleted: the row, its attestations,
// its vouch/flag counters and its history stay exactly as they were, and the
// next catalog that lists the project again flips `imported` back to true
// through the normal upsert.
//
// The caller must only reach this after a COMPLETE catalog walk: absence from a
// partial catalog says nothing about a project's state upstream.
export const deactivateProjectsMissingFromCatalog = async (
  source: string,
  catalogProjectIds: ReadonlySet<string>,
  options: { catalogTotal?: number | null } = {}
): Promise<string[]> => {
  // A complete walk that yielded zero projects is indistinguishable from an
  // upstream fault that emptied the catalog (a bad deploy, a filter that lost
  // its predicate, a tenant misconfiguration) - and acting on it would hide
  // every project of this source at once. Nothing in a successful-but-empty
  // response can positively establish that the catalog legitimately went to
  // zero, so refuse to reconcile instead of guessing.
  if (catalogProjectIds.size === 0) {
    throw new Error(
      `Refusing to reconcile ${source} projects: the catalog fetch completed without a single project, which cannot be told apart from an upstream fault`
    );
  }

  // Checked before the database is touched, so a rejected run cannot have
  // written anything. The return value decides which ceiling applies below.
  const walkConfirmedComplete = confirmCatalogWalkIsComplete(
    source,
    catalogProjectIds.size,
    options.catalogTotal ?? null
  );

  const dataSource = await getDataSource();
  if (!dataSource) {
    throw new Error(
      `Failed to reconcile ${source} projects: data source not found - reconciliation did not run`
    );
  }

  // Only rows of this source, and only ones currently listed: projects from
  // other integrations are never touched, and an already hidden project is not
  // rewritten on every run.
  const listed = await dataSource
    .getRepository(Project)
    .createQueryBuilder("project")
    .select("project.id")
    .where("project.source = :source", { source })
    .andWhere("project.imported = true")
    .getMany();

  const stale = listed
    .map((project) => project.id)
    .filter((id) => !catalogProjectIds.has(id));

  const maxDeactivations = resolveDeactivationCeiling(
    listed.length,
    walkConfirmedComplete
  );
  if (stale.length > maxDeactivations) {
    // Two different failures, so two different remedies: an unconfirmed walk
    // most likely WAS truncated and wants investigating, while a confirmed one
    // over the ceiling is a real bulk removal that wants a deliberate raise.
    const why = walkConfirmedComplete
      ? `over the ${maxDeactivations} ceiling for a walk confirmed complete against the catalog's own count - a run that hides this share of the listings needs GIVETH_MAX_DEACTIVATIONS_PER_RUN raised deliberately`
      : `over the ${maxDeactivations} per-run ceiling, and the catalog served no total to confirm the walk was complete - a catalog that short is more likely a truncated fetch than upstream churn`;
    throw new Error(
      `Refusing to reconcile ${source} projects: ${stale.length} of ${listed.length} listed project(s) are absent from a catalog of ${catalogProjectIds.size}, ${why}`
    );
  }

  if (stale.length === 0) {
    console.log(
      `${source} reconciliation: ${listed.length} listed project(s), none missing from the catalog`
    );
    return [];
  }

  // One transaction: either every stale project is hidden or none is, so a
  // failure part-way through cannot leave the listing half-reconciled. A throw
  // here propagates to the importer, which reports the run as failed.
  await dataSource.transaction(async (manager) => {
    for (let i = 0; i < stale.length; i += DEACTIVATE_CHUNK_SIZE) {
      const ids = stale.slice(i, i + DEACTIVATE_CHUNK_SIZE);
      await manager
        .createQueryBuilder()
        .update(Project)
        .set({ imported: false, lastUpdatedTimestamp: new Date() })
        .where("id IN (:...ids)", { ids })
        .execute();
    }
  });

  console.log(
    `[${new Date().toISOString()}] - INFO: ${
      stale.length
    } ${source} project(s) hidden from listings, no longer in the catalog. Project IDs: ${stale.join(
      ", "
    )}`
  );
  return stale;
};
