import { SourceConfig } from "../types";

// Giveth V6 core GraphQL endpoint. No default on purpose: the only Giveth
// source is the V6 `devouchProjectCatalog` query (#189), and the V5 public API
// this used to fall back to does not expose it. Falling back would silently
// re-introduce V5 as a source, so an unset URL disables the source instead.
export const GIVETH_API_URL = process.env.GIVETH_API_URL;

// `devouchProjectCatalog` accepts 1-100 (MAX_PAGE_SIZE on the V6 side).
export const GIVETH_API_LIMIT = 50;

// The catalog is behind HTTP Basic auth because it enumerates ACTIVE unlisted
// projects. Unauthenticated requests still return HTTP 200 with an
// UNAUTHENTICATED entry in `errors`, so the failure surfaces through the
// response's `errors` check rather than through the status code.
const GIVETH_API_USERNAME = process.env.GIVETH_API_USERNAME;
const GIVETH_API_PASSWORD = process.env.GIVETH_API_PASSWORD;

// The V5 public API this importer used to default to. It does not expose the
// catalog, and the credentials must never be sent to it: an `.env` that still
// carries the old default would otherwise leak the pair on every page request.
export const GIVETH_V5_PUBLIC_API_HOST = "mainnet.serve.giveth.io";

export type GivethCatalogConfig = {
  url: string;
  headers: Record<string, string>;
};

// Resolved once per import run. Nothing set means the source is not enabled in
// this environment (`null`, reported via skipImport like the other optional
// sources); a partially set trio is a configuration error, not a reason to send
// an anonymous request that would only come back UNAUTHENTICATED.
export const givethCatalogConfig = (): GivethCatalogConfig | null => {
  const values: Record<string, string | undefined> = {
    GIVETH_API_URL,
    GIVETH_API_USERNAME,
    GIVETH_API_PASSWORD,
  };
  const missing = Object.keys(values).filter((key) => !values[key]);
  if (missing.length === Object.keys(values).length) return null;
  if (missing.length > 0) {
    throw new Error(
      `Giveth V6 catalog is not configured: missing ${missing.join(", ")}`
    );
  }

  const url = GIVETH_API_URL!;
  // A fully-qualified hostname may carry the DNS root label
  // (`mainnet.serve.giveth.io.`); `URL` keeps it, so strip it or the check
  // misses and the pair is sent to V5 before the catalog request fails.
  const hostname = new URL(url).hostname.replace(/\.$/, "");
  if (hostname === GIVETH_V5_PUBLIC_API_HOST) {
    throw new Error(
      `GIVETH_API_URL points at the V5 public API (${GIVETH_V5_PUBLIC_API_HOST}), which does not serve the catalog; set it to a Giveth V6 core endpoint`
    );
  }

  const encoded = Buffer.from(
    `${GIVETH_API_USERNAME}:${GIVETH_API_PASSWORD}`
  ).toString("base64");
  return { url, headers: { Authorization: `Basic ${encoded}` } };
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
