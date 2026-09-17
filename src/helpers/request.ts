export const graphQLRequest = async (
  url: string,
  query: string,
  variables: any,
  extraHeaders: Record<string, string> = {}
) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GraphQL request failed: ${res.status} - ${text}`);
  }

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
    throw new Error(`GraphQL request failed: ${res.status} - ${text}`);
  }

  return await res.json();
};
