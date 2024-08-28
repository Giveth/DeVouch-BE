import { SourceConfig } from "../types";

export const RF_API_URL =
  process.env.RF4_API_URL || "https://vote.optimism.io/api/v1";

export const rfSourceConfig: SourceConfig = {
  source: "rf",
  idField: "id",
  titleField: "name",
  descriptionField: "description",
  imageField: "projectCoverImageUrl",
  urlField: "url",
  rfRoundField: "rfRound",
};
