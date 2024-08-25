import { RF_API_URL } from "./constants";
import { saveBatchProjects } from "./helpers";
import { RfApiResponse, RfProjectInfo } from "./type";

export const fetchRFProjectsByRound = async (round: number) => {
  let offset = 0;
  const limit = 10;
  let hasNext = true;

  console.log(
    `[${new Date().toISOString()}] - Fetching projects for round: ${round} - ${process.env.AGORA_API_KEY}`
  );

  try {
    while (hasNext) {
      const response = await fetch(
        `${RF_API_URL}/retrofunding/rounds/${round}/projects?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.AGORA_API_KEY}`,
          },
        }
      );
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
    console.error(
      `Error fetching projects for round: ${round} at offset: ${offset}`,
      error
    );
  }
};
