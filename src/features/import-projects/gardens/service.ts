import { graphQLRequestAPIKey } from "../../../helpers/request";

export const fetchGardensProjectsBatch = async (
  first: number,
  skip: number,
  subgraph: any
) => {
  try {
    const res = await graphQLRequestAPIKey(
      subgraph.url,
      `
        query getCommunities($first: Int, $skip: Int) {
          registryCommunities(first: $first, skip: $skip, where: { isValid: true }) {
            id
            chainId
            isValid
            communityName
            covenantIpfsHash
            registerToken
            alloAddress
          }
        }
      `,
      {
        first,
        skip,
      }
    );

    if (!res || !res.data || !res.data.registryCommunities) {
      console.error(
        "Unexpected GraphQL response from subgraph:",
        subgraph.name
      );
      console.dir(res, { depth: null });
      return [];
    }

    return res.data.registryCommunities;
  } catch (error: any) {
    console.log("Error on fetchGardensProjectsBatch:", error.message);
    return [];
  }
};
