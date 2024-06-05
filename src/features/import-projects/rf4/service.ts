import { RF4_API_URL } from "./constants";
import { Rf4ProjectInfo } from "./type";

export const fetchRf4Projects = async () => {
  try {
    const res = await fetch(RF4_API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data: Rf4ProjectInfo[] = await res.json();

    return data;
  } catch (error: any) {
    console.log("error on fetching fetchRf4Projects", error.message);
    return null;
  }
};
