export const RPGF3_API_URL =
  process.env.RPGF3_API_URL || "https://backend.pairwise.vote/mock/projects";

export const rpgf3SourceConfig = {
  source: "rpgf3",
  idField: "RPGF3Id",
  titleField: "name",
  descriptionField: "impactDescription",
  slugField: "url",
  imageField: "image",
};
