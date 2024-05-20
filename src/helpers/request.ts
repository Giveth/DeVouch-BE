export const graphQLRequest = async (query: string, variables: any) => {
  const res = await fetch("https://mainnet.serve.giveth.io/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  return await res.json();
};
