import { graphQLRequest } from "../../helpers/request";

export const fetchGivethProjects = async () => {
  const res = await graphQLRequest(
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
      limit: 10,
      skip: 0,
      sortingBy: "Newest",
    }
  );
  return res.data.allProjects.projects;
};
