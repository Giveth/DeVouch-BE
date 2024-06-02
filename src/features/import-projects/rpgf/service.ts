import { RPGF3_API_URL } from "./constants";
import { Rpgf3ProjectInfo } from "./type";

export const fetchRpgf3Projects = async () => {
  [];
  const res = await fetch(RPGF3_API_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  let data: Rpgf3ProjectInfo[] = await res.json();

  return data;
};
