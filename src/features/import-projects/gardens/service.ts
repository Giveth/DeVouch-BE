import { graphQLRequestAPIKey } from "../../../helpers/request";

export const fetchGardensProjectsBatch = async (
  first: number,
  skip: number,
  subgraph: any
) => {
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

  if (res?.errors?.length) {
    throw new Error(
      res.errors.map((error: { message: string }) => error.message).join("; ")
    );
  }
  const communities = res?.data?.registryCommunities;
  // Never return [] on failure: the caller reads an empty page as end-of-data
  // and would report a truncated import as a completed one.
  if (!Array.isArray(communities))
    throw new Error(`Invalid Gardens response from subgraph ${subgraph.name}`);
  return communities;
};
