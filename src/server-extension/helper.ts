import { EProjectSort } from "./types";

export const getProjectSortBy = (sortBy: EProjectSort) => {
  switch (sortBy) {
    case EProjectSort.HIGHEST_VOUCH_COUNT:
      return { sortBy: "vouch", order: "DESC" };
    case EProjectSort.LOWEST_VOUCH_COUNT:
      return { sortBy: "vouch", order: "ASC" };
    case EProjectSort.HIGHEST_FLAG:
      return { sortBy: "flag", order: "DESC" };
    case EProjectSort.LOWEST_FLAG:
      return { sortBy: "flag", order: "ASC" };
    default:
      return { sortBy: "vouch", order: "DESC" };
  }
};

export function isValidDate(dateStr: string): boolean {
  if (typeof dateStr !== "string" || dateStr.trim() === "") {
    return false;
  }
  const date = new Date(dateStr);
  return !Number.isNaN(date.getTime());
}
