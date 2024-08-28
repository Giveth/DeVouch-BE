// Assuming RL_API_URLS and RlProjectInfo are defined as mentioned
import { RL_API_URLS } from "./constants";
import { RlProjectInfo, RoundNumber } from "./type";

export const fetchRlProjects = async (
  round: number
): Promise<RlProjectInfo[] | null> => {
  console.log(`Fetching RL projects for round ${round}`);
  try {
    // Check if the round exists in RL_API_URLS
    if (!(round in RL_API_URLS)) {
      console.log(`Invalid round number: ${round}`);
      return null;
    }

    // Use type assertion to narrow down the type of 'round' to RoundNumber
    const url = RL_API_URLS[round as RoundNumber];
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Check if the response is ok (status code in the range 200-299)
    if (!res.ok) {
      console.log(`Failed to fetch data: ${res.status} ${res.statusText}`);
      return null;
    }

    const data: RlProjectInfo[] = await res.json();
    console.log(`Fetched ${data.length} projects for round ${round}`);

    return data;
  } catch (error: any) {
    console.log("Error on fetching fetchRlProjects", error.message);
    return null;
  }
};
