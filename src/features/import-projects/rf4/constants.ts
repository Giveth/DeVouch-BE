export const RF4_API_URL =
  process.env.RF4_API_URL || "https://round4-api-eas.retrolist.app/projects";

export const rf4SourceConfig: SourceConfig = {
  source: "rf4",
  idField: "id",
  titleField: "name",
  descriptionField: "description",
  slugField: "url",
  imageField: "bannerImageUrl",
};
