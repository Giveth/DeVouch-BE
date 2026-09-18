import { graphQLRequest } from "../../../helpers/request";
import { GIVETH_API_URL, givethAuthHeaders } from "./constants";

// No auth headers here: this query runs against the public Giveth API, which
// needs none. Sending the catalog's credentials would leak them to that host
// whenever GIVETH_API_VERSION is unset while the pair is still configured.
export const fetchGivethProjectsBatch = async (limit: number, skip: number) => {
  const res = await graphQLRequest(
    GIVETH_API_URL,
    `query ($limit: Int, $skip: Int) {
        allProjects(
          limit: $limit
          skip: $skip
          sortingBy: Newest
          includeUnlisted: true
        ) {
          projects {
            id
            title
            image
            slug
            description
            creationDate
          }
        }
      }`,
    {
      limit,
      skip,
    }
  );

  if (res.errors?.length) {
    throw new Error(
      res.errors.map((error: { message: string }) => error.message).join("; ")
    );
  }
  const projects = res.data?.allProjects?.projects;
  // Never return [] on failure: the caller cannot tell that apart from
  // end-of-data and would report a truncated import as a completed one.
  if (!Array.isArray(projects))
    throw new Error("Invalid Giveth projects response");
  return projects;
};

export const fetchGivethCatalogBatch = async (
  take: number,
  afterId: number
) => {
  const res = await graphQLRequest(
    GIVETH_API_URL,
    `query ($take: Int!, $afterId: Int!) {
      devouchProjectCatalog(take: $take, afterId: $afterId) {
        projects { id title image slug description creationDate: createdAt }
      }
    }`,
    { take, afterId },
    givethAuthHeaders()
  );
  if (res.errors?.length) {
    throw new Error(
      res.errors.map((error: { message: string }) => error.message).join("; ")
    );
  }
  const projects = res.data?.devouchProjectCatalog?.projects;
  if (!Array.isArray(projects))
    throw new Error("Invalid Giveth catalog response");
  return projects;
};
