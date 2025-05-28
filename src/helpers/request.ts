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

export const graphQLRequestAPIKey = async (
  url: string,
  query: string,
  variables: any = {}
) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = process.env.THEGRAPH_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GraphQL request failed: ${res.status} - ${text} - ${url} - ${process.env.THEGRAPH_API_KEY}`);
  }

  return await res.json();
};
