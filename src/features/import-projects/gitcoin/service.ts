import { graphQLRequest } from "../../../helpers/request";
import { GITCOIN_API_URL } from "./constants";
import { GitcoinProjectInfo } from "./type";

export const fetchGitcoinProjectsBatch = async (
  first: number,
  offset: number
) => {
  try {
    const res = await graphQLRequest(
      GITCOIN_API_URL,
      `query fetchProjects($first: Int = 10, $offset: Int = 10) {
        projects(first: $first, offset: $offset, orderBy: ID_DESC) {
          id
          name
          applications {
            roundId
            chainId
            id
          }
          metadata
        }
      }`,
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

export const fetchGitcoinProjects = async () => {
  let allProjects: GitcoinProjectInfo[] = [];
  let hasMoreProjects = true;
  let offset = 0;
  const first = 10;

  while (hasMoreProjects) {
    const projectsBatch = await fetchGitcoinProjectsBatch(first, offset);
    if (projectsBatch.length > 0) {
      allProjects = allProjects.concat(projectsBatch);
      offset += first;
    } else {
      hasMoreProjects = false;
    }
  }

  return allProjects;
};
