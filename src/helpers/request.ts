export const graphQLRequest = async (
  url: string,
  query: string,
  variables: any
) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  return await res.json();
};
