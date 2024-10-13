import { AGORA_API_KEY } from "../../../constants";
import { RF_API_URL } from "./constants";
import { saveBatchProjects } from "./helpers";
import { RfApiResponse, RfProjectInfo } from "./type";

export const fetchRFProjectsByRound = async (round: number) => {
  let offset = 0;
  const limit = 10;
  let hasNext = true;

  console.log(
    `[${new Date().toISOString()}] - Fetching projects for round: ${round}`
  );

  if (!AGORA_API_KEY) {
    console.log("AGORA_API_KEY is not set");
    return;
  }

  try {
    while (hasNext) {
      const address = `${RF_API_URL}/retrofunding/rounds/${round}/projects?limit=${limit}&offset=${offset}`;
      const response = await fetch(address, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AGORA_API_KEY}`,
        },
      });
      console.log(
        `[${new Date().toISOString()}] - Fetching projects for round: ${round} at offset: ${offset} - ${response.status} - ${response.ok}`
      );

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} for round: ${round} at offset: ${offset}`
        );
      }

      const res: RfApiResponse = await response.json();

      await saveBatchProjects(res.data, round);

      hasNext = res.meta.has_next;
      offset = res.meta.next_offset;
    }
  } catch (error) {
    console.log(
      `[${new Date().toISOString()}] - Error fetching projects for round: ${round} at offset: ${offset}`,
      error
    );
  }
};
