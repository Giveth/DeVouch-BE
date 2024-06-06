import { type Rf4ProjectInfo } from "./type";

export const generateRf4Url = (project: Rf4ProjectInfo) => {
  return `/project/${project.id}`;
};

