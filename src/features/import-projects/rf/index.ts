import { RF_API_URL } from "./constants";
import { saveBatchProjects } from "./helpers";
import { RfApiResponse, RfProjectInfo } from "./type";

export const fetchRFProjectsByRound = async (round: number) => {
  let allProjects: RfProjectInfo[] = [];
  let offset = 0;
  const limit = 10;
  let hasNext = true;

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const res: RfApiResponse = await response.json();

      // allProjects = allProjects.concat(res.data);

      await saveBatchProjects(res.data, round);

      hasNext = res.meta.has_next;
      offset = res.meta.next_offset;
    }

    console.log(allProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
  }

  return allProjects;
};
