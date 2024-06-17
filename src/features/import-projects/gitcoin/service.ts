import { graphQLRequest } from "../../../helpers/request";
import { GITCOIN_API_URL } from "./constants";

export const fetchGitcoinProjectsBatch = async (
  first: number,
  offset: number
) => {
  try {
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
            chainId: { in: [1, 137, 10, 324, 42161, 42220, 43114, 534352, 8453] }
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

    return res.data.projects;
  } catch (error: any) {
    console.log("error on fetchGitcoinProjectsBatch", error.message);
    return [];
  }
};
