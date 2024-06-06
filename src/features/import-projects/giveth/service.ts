import { graphQLRequest } from "../../../helpers/request";
import { GIVETH_API_URL } from "./constants";
import { GivethProjectInfo } from "./type";

export const fetchGivethProjectsBatch = async (limit: number, skip: number) => {
  try {
    const res = await graphQLRequest(
      GIVETH_API_URL,
      `query ($limit: Int, $skip: Int) {
        allProjects(
          limit: $limit
          skip: $skip
          sortingBy: Newest
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
      }
    );

    console.log('res', res)

    return res.data.allProjects.projects;
  } catch (error: any) {
    console.log("error on fetchGivethProjectsBatch", error.message);
    return [];
  }
};
