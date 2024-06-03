export const GITCOIN_API_URL =
  process.env.GITCOIN_API_URL ||
  "https://grants-stack-indexer-v2.gitcoin.co/graphql";

export const IPFS_GATEWAY = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs";

export const GITCOIN_API_LIMIT = 100;

export const gitcoinSourceConfig: SourceConfig = {
  source: "gitcoin",
  idField: "id",
  titleField: "title",
  descriptionField: "description",
  slugField: "slug",
  imageField: "image",
};
