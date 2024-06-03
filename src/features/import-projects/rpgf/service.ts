import { RPGF3_API_URL } from "./constants";
import { Rpgf3ProjectInfo } from "./type";

export const fetchRpgf3Projects = async () => {
  try {
    const res = await fetch(RPGF3_API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data: Rpgf3ProjectInfo[] = await res.json();

    return data;
  } catch (error: any) {
    console.log("error on fetching fetchRpgf3Projects", error.message);
    return null;
  }
};
