import { SourceConfig } from "../types";

export const GIVETH_API_URL =
  process.env.GIVETH_API_URL || "https://mainnet.serve.giveth.io/graphql";

export const GIVETH_API_LIMIT = 50;

// The V6 `devouchProjectCatalog` query is behind HTTP Basic auth on a
// self-hosted impact-graph. Unauthenticated requests still return HTTP 200 with
// an UNAUTHENTICATED entry in `errors`, so the failure surfaces through the
// response's `errors` check rather than through the status code.
const GIVETH_API_USERNAME = process.env.GIVETH_API_USERNAME;
const GIVETH_API_PASSWORD = process.env.GIVETH_API_PASSWORD;

// Only sent when both are configured, and only on the catalog query: the legacy
// `allProjects` query runs against the public API, which needs no credentials.
export const givethAuthHeaders = (): Record<string, string> => {
  if (!GIVETH_API_USERNAME || !GIVETH_API_PASSWORD) return {};

  const encoded = Buffer.from(
    `${GIVETH_API_USERNAME}:${GIVETH_API_PASSWORD}`
  ).toString("base64");
  return { Authorization: `Basic ${encoded}` };
};

export const givethSourceConfig: SourceConfig = {
  source: "giveth",
  idField: "id",
  titleField: "title",
  descriptionField: "description",
  urlField: "url",
  imageField: "image",
  sourceCreatedAtField: "creationDate",
};
