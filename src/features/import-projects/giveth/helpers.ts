import { getDataSource } from "../../../helpers/db";
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
// resolve for DeVouch's frontend, so relative paths get the frontend host.
// Anything that already carries a scheme is left alone; a protocol-relative
// `//host/path` only gets a scheme. Missing images stay `null`.
export const resolveGivethImageUrl = (
  image: string | null | undefined,
  baseUrl: string = GIVETH_IMAGE_BASE_URL
): string | null => {
  if (!image) return null;
  const trimmed = image.trim();
  if (trimmed === "") return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
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
