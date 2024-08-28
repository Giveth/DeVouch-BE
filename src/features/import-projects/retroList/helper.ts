import { type RlProjectInfo } from "./type";

export const generateRlUrl = (project: RlProjectInfo) => {
  return `/project/${project.id}`;
};
