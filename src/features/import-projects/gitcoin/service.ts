import { graphQLRequest } from "../../../helpers/request";
import { GITCOIN_API_URL } from "./constants";

export const fetchGitcoinProjectsBatch = async (
  first: number,
  offset: number
) => {
  const res = await graphQLRequest(
    GITCOIN_API_URL,
    `query fetchProjects($first: Int = 10, $offset: Int = 10) {
        projects(
          first: $first
          offset: $offset
          orderBy: ID_DESC
          filter: {
            tags: { contains: "allo-v2" }
            projectType: { equalTo: CANONICAL }
            chainId: { in: [1, 137, 10, 324, 42161, 42220, 43114, 534352, 8453, 100, 421614] }
            not: { tags: { contains: "program" } }
            rounds: { every: { applicationsExist: true } }
          }
        ) {
          id
          name
          metadata
        }
      }
      `,
    {
      first,
      offset,
    }
  );

  if (res.errors?.length) {
    throw new Error(
      res.errors.map((error: { message: string }) => error.message).join("; ")
    );
  }
  const projects = res.data?.projects;
  // Never return [] on failure: the caller reads an empty page as end-of-data
  // and would report a truncated import as a completed one.
  if (!Array.isArray(projects))
    throw new Error("Invalid Gitcoin projects response");
  return projects;
};
