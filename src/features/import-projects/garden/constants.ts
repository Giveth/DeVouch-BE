import { SourceConfig } from "../types";

export const THEGRAPH_API_URL =
  process.env.THEGRAPH_API_URL ||
  "https://gateway.thegraph.com/api/subgraphs/id/";

const GARDENS_SUBGRAPHS = [
  {
    chainId: 10, // Optimism
    name: "Optimism",
    url: `${THEGRAPH_API_URL}FmcVWeR9xdJyjM53DPuCvEdH24fSXARdq4K5K8EZRZVp`,
  },
  {
    chainId: 42220, // Celo
    name: "Celo",
    url: `${THEGRAPH_API_URL}BsXEnGaXdj3CkGRn95bswGcv2mQX7m8kNq7M7WBxxPx8`,
  },
  {
    chainId: 137, // Polygon
    name: "Polygon",
    url: `${THEGRAPH_API_URL}4vsznmRkUGm9DZFBwvC6PDvGPVfVLQcUUr5ExdTNZiUc`,
  },
  {
    chainId: 42161, // Arbitrum
    name: "Arbitrum",
    url: `${THEGRAPH_API_URL}9ejruFicuLT6hfuXNTnS8UCwxTWrHz4uinesdZu1dKmk`,
  },
  {
    chainId: 100, // Gnosis
    name: "Gnosis",
    url: `${THEGRAPH_API_URL}ELGHrYhvJJQrYkVsYWS5iDuFpQ1p834Q2k2kBmUAVZAi`,
  },
  {
    chainId: 8453, // Base
    name: "Base",
    url: `${THEGRAPH_API_URL}HAjsxiYJEkV8oDZgVTaJE9NQ2XzgqekFbY99tMGu53eJ`,
  },
];

// Arbitrum Sepolia (testnet) - include in development
if (process.env.NODE_ENV === "development") {
  GARDENS_SUBGRAPHS.push({
    chainId: 421614,
    name: "Arbitrum Sepolia",
    url: `${THEGRAPH_API_URL}BfZYwhZ1rTb22Nah1u6YyXtUtAdgGNtZhW1EBb4mFzAU`,
  });
}

export { GARDENS_SUBGRAPHS };

export const GARDEN_IMAGE_CID =
  "Qme9BKMXbTkjr71FrD6BvMcFXny3TLYFYHLWz7q7BBsbGU";

export const GARDEN_API_LIMIT = 2;

export const IPFS_GATEWAY =
  process.env.IPFS_GATEWAY || "https://giveth.mypinata.cloud/ipfs";

export const gardensSourceConfig: SourceConfig = {
  source: "garden",
  idField: "id",
  titleField: "title",
  descriptionField: "description",
  imageField: "image",
  urlField: "url",
  descriptionHtmlField: "descriptionHtml",
  sourceCreatedAtField: "creationDate",
};
