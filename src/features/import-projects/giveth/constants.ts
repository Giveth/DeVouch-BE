export const GIVETH_API_URL =
  process.env.GIVETH_API_URL || "https://mainnet.serve.giveth.io/graphql";

export const givethSourceConfig: SourceConfig = {
  source: "giveth",
  idField: "id",
  titleField: "title",
  descriptionField: "descriptionSummary",
  slugField: "slug",
  imageField: "image",
};
