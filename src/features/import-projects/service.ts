import { graphQLRequest } from "../../helpers/request";
import { GIVETH_API_URL } from "./constants";
import { GivethProjectInfo } from "./type";

export const fetchGivethProjectsBatch = async (limit: number, skip: number) => {
  const res = await graphQLRequest(
    GIVETH_API_URL,
    `query ($limit: Int, $skip: Int, $sortingBy: SortingField) {
      allProjects(
        limit: $limit
        skip: $skip
        sortingBy: $sortingBy
      ) {
        projects {
          id
          title
          image
          slug
          descriptionSummary
        }
      }
    }`,
    {
      limit,
      skip,
      sortingBy: "Newest",
    }
  );

  return res.data.allProjects.projects;
};

export const fetchGivethProjects = async () => {
  let allProjects: GivethProjectInfo[] = [];
  let hasMoreProjects = true;
  let skip = 0;
  const limit = 10;

  while (hasMoreProjects) {
    const projectsBatch = await fetchGivethProjectsBatch(limit, skip);
    if (projectsBatch.length > 0) {
      allProjects = allProjects.concat(projectsBatch);
      skip += limit;
    } else {
      hasMoreProjects = false;
    }
  }

  return allProjects;
};
