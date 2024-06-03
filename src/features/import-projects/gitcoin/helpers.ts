import type { GitcoinProjectInfo } from "./type";
import { updateOrCreateProject } from "../helpers";
import { IPFS_GATEWAY, gitcoinSourceConfig } from "./constants";

const generateGitcoinSlug = (project: GitcoinProjectInfo) => {
  const application = project.applications[0];

  if (
    !application ||
    !application?.roundId ||
    !application?.chainId ||
    !application?.id
  )
    return ``;

  const { chainId, roundId, id } = application;
  return `#/round/${chainId}/${roundId}/${id}`;
};

const convertIpfsHashToHttps = (hash: string) => {
  return `${IPFS_GATEWAY}/${hash}`;
};

export const processProjectsBatch = async (
  projectsBatch: GitcoinProjectInfo[]
) => {
  for (const project of projectsBatch) {
    if (project.metadata?.type !== "project") continue;
    const processedProject = {
      id: project.id,
      title: project.name || project.metadata?.title,
      description: project.metadata?.description,
      slug: generateGitcoinSlug(project),
      image: project.metadata?.bannerImg
        ? convertIpfsHashToHttps(project.metadata?.bannerImg)
        : "",
    };
    await updateOrCreateProject(processedProject, gitcoinSourceConfig);
  }
};
