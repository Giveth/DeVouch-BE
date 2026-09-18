import { describe, expect, test, afterAll, beforeAll } from "@jest/globals";
import { closeConnection, deleteAll, getTestEntityManager } from "./utils";
import {
  addTally,
  emptyTally,
  inspected,
  recordOutcome,
  updateOrCreateProject,
} from "../features/import-projects/helpers";
import { givethSourceConfig } from "../features/import-projects/giveth/constants";
import { Project } from "../model";

// Pins the distinction the tally exists for: an already up-to-date project is
// inspected without any SQL being issued, so it must not be counted as written.
// Counting it as written made the import report a clean run against a database
// that accepts reads but rejects writes.
describe("updateOrCreateProject outcomes", () => {
  const project = {
    id: "9001",
    title: "Test Project",
    description: "A description",
    slug: "test-project",
    image: "img.png",
    url: "/project/test-project",
    creationDate: "2026-01-01T00:00:00.000Z",
  };

  beforeAll(async () => {
    const em = await getTestEntityManager();
    await deleteAll(em, Project);
  });
  afterAll(async () => {
    await closeConnection();
  });

  test("reports created, then unchanged, then updated", async () => {
    expect(
      await updateOrCreateProject({ ...project }, givethSourceConfig)
    ).toBe("created");

    // Identical input: no fields differ, so no UPDATE is issued.
    expect(
      await updateOrCreateProject({ ...project }, givethSourceConfig)
    ).toBe("unchanged");

    expect(
      await updateOrCreateProject(
        { ...project, title: "Renamed" },
        givethSourceConfig
      )
    ).toBe("updated");

    // ...and is unchanged again once the new title is persisted.
    expect(
      await updateOrCreateProject(
        { ...project, title: "Renamed" },
        givethSourceConfig
      )
    ).toBe("unchanged");
  });
});

describe("import tally", () => {
  test("counts writes separately from unchanged and skipped rows", () => {
    const tally = emptyTally();
    recordOutcome(tally, "created");
    recordOutcome(tally, "updated");
    recordOutcome(tally, "unchanged");
    recordOutcome(tally, "unchanged");
    recordOutcome(tally, "skipped");
    recordOutcome(tally, "failed");

    expect(tally).toEqual({
      written: 2,
      unchanged: 2,
      skipped: 1,
      failed: 1,
    });
    expect(inspected(tally)).toBe(6);
  });

  test("a run that only inspected unchanged rows reports zero writes", () => {
    const tally = emptyTally();
    for (let i = 0; i < 3000; i++) recordOutcome(tally, "unchanged");

    expect(tally.written).toBe(0);
    expect(tally.unchanged).toBe(3000);
    expect(inspected(tally)).toBe(3000);
  });

  test("addTally accumulates across batches", () => {
    const total = addTally(
      { written: 1, unchanged: 2, skipped: 3, failed: 4 },
      { written: 10, unchanged: 20, skipped: 30, failed: 40 }
    );

    expect(total).toEqual({
      written: 11,
      unchanged: 22,
      skipped: 33,
      failed: 44,
    });
  });
});
