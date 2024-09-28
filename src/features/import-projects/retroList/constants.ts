import { SourceConfig } from "../types";
import { RoundNumber } from "./type";

// Define RL_API_URLS with specific round number keys
export const RL_API_URLS: Record<RoundNumber, string> = {
  4: process.env.RL4_API_URL || "https://round4-api-eas.retrolist.app/projects",
  5:
    process.env.RL5_API_URL ||
    "https://round5-api-eas.retrolist.app/5/projects",
};

export const rlSourceConfig: SourceConfig = {
  source: "rf",
  idField: "id",
  titleField: "name",
  descriptionField: "description",
  imageField: "bannerImageUrl",
  urlField: "url",
  rfRoundField: "rfRound",
  prelimResult: "prelimResult",
};
