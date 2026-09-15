import { AGORA_API_KEY } from "../../../constants";
import { RF_API_URL } from "./constants";
import { saveBatchProjects } from "./helpers";
import { RfApiResponse, RfProjectInfo } from "./type";
import { ImportResult, ImportTally } from "../types";
import { abortImport, addTally, emptyTally, finishImport } from "../helpers";

export const fetchRFProjectsByRound = async (
  round: number
): Promise<ImportResult> => {
  const source = `rf-round-${round}`;
  const tally: ImportTally = emptyTally();
  let offset = 0;
  const limit = 10;
  let hasNext = true;

  console.log(
    `[${new Date().toISOString()}] - Fetching projects for round: ${round}`
  );

  if (!AGORA_API_KEY) {
    // Missing configuration, not a failed import: report it as such rather than
    // letting the run look like a clean zero-project success.
    return abortImport(source, tally, new Error("AGORA_API_KEY is not set"));
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

      addTally(tally, await saveBatchProjects(res.data, round));

      hasNext = res.meta.has_next;
      offset = res.meta.next_offset;
    }

    return finishImport(source, tally);
  } catch (error: any) {
    return abortImport(source, tally, error);
  }
};
