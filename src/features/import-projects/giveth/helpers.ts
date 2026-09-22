import { type GivethProjectInfo } from "./type";
import { emptyTally, recordProject } from "../helpers";
import { ImportTally } from "../types";
import { GIVETH_IMAGE_BASE_URL, givethSourceConfig } from "./constants";

export const generateGivethUrl = (project: GivethProjectInfo) => {
  return `/project/${project.slug}`;
};

// Uploaded project images arrive as absolute URLs (S3, IPFS gateways), but the
// default placeholder images are served by the Giveth frontend and arrive as
// paths (`/images/defaultProjectImages/3.png`). Stored as-is, those never
// resolve for DeVouch's frontend, so they are resolved against the frontend
// origin with standard URL resolution: absolute URLs and other schemes pass
// through, `//host/path` gets the base's scheme. Missing images stay `null`;
// a value the URL parser rejects outright is kept as it came.
export const resolveGivethImageUrl = (
  image: string | null | undefined,
  baseUrl: string = GIVETH_IMAGE_BASE_URL
): string | null => {
  const trimmed = image?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed, `${baseUrl.replace(/\/+$/, "")}/`).href;
  } catch {
    return trimmed;
  }
};

// Returns a per-outcome tally. `written` is the only bucket that implies SQL was
// issued: an already up-to-date project lands in `unchanged` having produced a
// SELECT and nothing else.
export const processProjectsBatch = async (
  projectsBatch: GivethProjectInfo[]
): Promise<ImportTally> => {
  const tally = emptyTally();
  for (const project of projectsBatch) {
    const processedProject = {
      ...project,
      url: generateGivethUrl(project),
      image: resolveGivethImageUrl(project.image),
    };
    await recordProject(tally, processedProject, givethSourceConfig);
  }
  return tally;
};
