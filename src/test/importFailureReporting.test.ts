import { emptyTally, recordProject } from "../features/import-projects/helpers";
import { manageProjectRemovals } from "../features/import-projects/retroList/helper";
import { rlSourceConfig } from "../features/import-projects/retroList/constants";

jest.mock("../helpers/db", () => ({
  getDataSource: jest.fn(),
  createEntityManager: jest.fn(),
}));
const { getDataSource } = require("../helpers/db");

describe("recordProject keeps a batch tally when a project throws", () => {
  afterEach(() => jest.clearAllMocks());

  // A throw from updateOrCreateProject used to escape the batch helper, so the
  // outcomes already recorded for the rest of the batch were discarded and
  // IMPORT_SUMMARY under-reported the projects that had succeeded.
  it("records a read failure as failed instead of propagating", async () => {
    getDataSource.mockResolvedValue({
      getRepository: () => ({
        createQueryBuilder: () => ({
          where: () => ({
            getOne: () => Promise.reject(new Error("connection terminated")),
          }),
        }),
      }),
    });

    const tally = emptyTally();
    await expect(
      recordProject(tally, { id: "1", title: "t" }, rlSourceConfig)
    ).resolves.toBeDefined();

    expect(tally.failed).toBe(1);
    expect(tally.written).toBe(0);
  });

  it("does not lose earlier outcomes when a later project fails", async () => {
    const tally = emptyTally();
    // Two failures in a row: the tally survives both rather than being lost.
    getDataSource.mockResolvedValue(null);
    await recordProject(tally, { id: "1", title: "a" }, rlSourceConfig);
    await recordProject(tally, { id: "2", title: "b" }, rlSourceConfig);

    expect(tally.failed).toBe(2);
  });
});

describe("manageProjectRemovals propagates incomplete reconciliation", () => {
  afterEach(() => jest.clearAllMocks());

  it("throws when the new list is null instead of resolving", async () => {
    await expect(
      manageProjectRemovals(null, rlSourceConfig, 5)
    ).rejects.toThrow(/new list is null/);
  });

  it("throws when the data source is missing instead of resolving", async () => {
    getDataSource.mockResolvedValue(null);

    await expect(manageProjectRemovals([], rlSourceConfig, 5)).rejects.toThrow(
      /data source not found/
    );
  });
});
