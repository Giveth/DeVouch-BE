import { graphQLRequest } from "../../../helpers/request";
import { type GivethCatalogConfig } from "./constants";
import { type GivethProjectInfo } from "./type";

// The only Giveth fetcher (#189): V6's dedicated importer catalog. It serves
// every ACTIVE project, publicly listed or not, keyset-paginated by ascending
// id, and serializes `id` as a string - the same public numeric id the project
// had on V5, so `giveth-<id>` keeps pointing at the same DeVouch row.
export const fetchGivethCatalogBatch = async (
  config: GivethCatalogConfig,
  take: number,
  afterId: number
): Promise<GivethProjectInfo[]> => {
  const res = await graphQLRequest(
    config.url,
    `query ($take: Int!, $afterId: Int!) {
      devouchProjectCatalog(take: $take, afterId: $afterId) {
        projects { id title image slug description creationDate: createdAt }
      }
    }`,
    { take, afterId },
    config.headers
  );
  if (res.errors?.length) {
    throw new Error(
      res.errors.map((error: { message: string }) => error.message).join("; ")
    );
  }
  const projects = res.data?.devouchProjectCatalog?.projects;
  // Never return [] on failure: the caller cannot tell that apart from
  // end-of-data and would report a truncated import as a completed one.
  if (!Array.isArray(projects))
    throw new Error("Invalid Giveth catalog response");
  return projects;
};
