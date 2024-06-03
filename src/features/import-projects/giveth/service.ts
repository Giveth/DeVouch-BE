import { graphQLRequest } from "../../../helpers/request";
import { GIVETH_API_URL } from "./constants";
import { GivethProjectInfo } from "./type";

export const fetchGivethProjectsBatch = async (limit: number, skip: number) => {
  try {
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
  } catch (error: any) {
    console.log("error on fetchGivethProjectsBatch", error.message);
    return [];
  }
};
