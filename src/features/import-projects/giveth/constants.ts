import { SourceConfig } from "../types";

export const GIVETH_API_URL =
  process.env.GIVETH_API_URL || "https://mainnet.serve.giveth.io/graphql";

export const GIVETH_API_LIMIT = 50;

export const givethSourceConfig: SourceConfig = {
  source: "giveth",
  idField: "id",
  titleField: "title",
  descriptionField: "description",
  urlField: "url",
  imageField: "image",
};
