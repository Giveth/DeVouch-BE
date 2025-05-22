import type { GardenProjectInfo } from "./type";
import { updateOrCreateProject } from "../helpers";
import { IPFS_GATEWAY, gardensSourceConfig } from "./constants";
import Showdown from "showdown";

const generateGardenUrl = (project: GardenProjectInfo): string => {
  if (!project.chainId || !project.registerToken || !project.id) {
    return "";
  }

  return `/${project.chainId}/${project.registerToken}/${project.id}`;
};

const convertIpfsHashToHttps = (hash: string) => {
  return `${IPFS_GATEWAY}/${hash}`;
};

const getDescription = async (covenantIpfsHash: string) => {
  if (!covenantIpfsHash) return "";
  try {
    const response = await fetch(`${IPFS_GATEWAY}/${covenantIpfsHash}`);

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (typeof data === "object" && data.covenant) {
        return data.covenant;
      }
      return "";
    }
  } catch (error) {
    console.error(`Error fetching IPFS content (${covenantIpfsHash}):`, error);
    return "Failed to fetch description from IPFS";
  }
};

const converter = new Showdown.Converter();
export const processProjectsBatch = async (
  projectsBatch: GardenProjectInfo[]
) => {
  for (const project of projectsBatch) {
    if (!project?.id) continue;
    const description = await getDescription(project.covenantIpfsHash || "");

    const descriptionStr =
      typeof description === "string"
        ? description
        : JSON.stringify(description);

    const processedProject = {
      id: project.id,
      title: project.name || project.communityName,
      description: descriptionStr,
      url: generateGardenUrl(project),
      image: "",
      descriptionHtml: descriptionStr
        ? converter.makeHtml(descriptionStr)
        : undefined,
      creationDate: null,
    };
    await updateOrCreateProject(processedProject, gardensSourceConfig);
  }
};
