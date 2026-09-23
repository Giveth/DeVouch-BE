import { graphQLRequest } from "../../../helpers/request";
import { type GivethCatalogConfig } from "./constants";
import { type GivethCatalogPage, type GivethProjectInfo } from "./type";

// `total` is a lazily resolved field on the V6 resolver: it is computed only
// when selected, as a COUNT over the whole project table, and it is read from
// Giveth's read replica while the page itself is read from the primary. It is
// therefore neither free nor snapshot-consistent with the page it arrives on -
// two reasons the walk asks for it once, on the first request, and treats it
// as an estimate of the catalog size at the start of the run.
const catalogQuery = (withTotal: boolean): string =>
  `query ($take: Int!, $afterId: Int!) {
      devouchProjectCatalog(take: $take, afterId: $afterId) {
        ${withTotal ? "total\n        " : ""}projects { id title image slug description creationDate: createdAt }
      }
    }`;

// A `total` that is absent, null or not a plain non-negative integer is
// reported as "unavailable" rather than thrown on: it is an optional extra
// signal, and an upstream that stops serving it must not take the import down
// with it. The completeness check skips itself when it gets null.
const readCatalogTotal = (catalog: any): number | null => {
  const total = catalog?.total;
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) {
    return null;
  }
  return total;
};

// The only Giveth fetcher (#189): V6's dedicated importer catalog. It serves
// every ACTIVE project, publicly listed or not, keyset-paginated by ascending
// id, and serializes `id` as a string - the same public numeric id the project
// had on V5, so `giveth-<id>` keeps pointing at the same DeVouch row.
export const fetchGivethCatalogBatch = async (
  config: GivethCatalogConfig,
  take: number,
  afterId: number,
  options: { withTotal?: boolean } = {}
): Promise<GivethCatalogPage> => {
  const withTotal = options.withTotal === true;
  const res = await graphQLRequest(
    config.url,
    catalogQuery(withTotal),
    { take, afterId },
    config.headers
  );
  if (res.errors?.length) {
    throw new Error(
      res.errors.map((error: { message: string }) => error.message).join("; ")
    );
  }
  const catalog = res.data?.devouchProjectCatalog;
  const projects: GivethProjectInfo[] = catalog?.projects;
  // Never return [] on failure: the caller cannot tell that apart from
  // end-of-data and would report a truncated import as a completed one.
  if (!Array.isArray(projects))
    throw new Error("Invalid Giveth catalog response");
  return { projects, total: withTotal ? readCatalogTotal(catalog) : null };
};
