import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import fs from "fs";
import os from "os";
import path from "path";
import { EntityManager } from "typeorm";
import { closeConnection, deleteAll, getTestEntityManager } from "./utils";
import { Project } from "../model";
import {
  BackupEntry,
  descriptionFormatOf,
  planRow,
  runCleanup,
  runRestore,
} from "../scripts/sanitizeProjectDescriptions";

const DIRTY_HTML =
  '<p>About <strong>us</strong></p><img src=x onerror="alert(1)"><script>alert(1)</script>';
const CLEAN_HTML = "<p>About <strong>us</strong></p><img />";
const MARKDOWN = "About **us** <img src=x onerror=alert(1)>";

let em: EntityManager;
let dir: string;
let backupFile: string;
const quiet = () => {};

const seed = (id: string, source: string, values: Partial<Project>) =>
  em.getRepository(Project).save(
    new Project({
      id,
      source,
      projectId: id,
      title: id,
      totalVouches: 0,
      totalFlags: 0,
      totalAttests: 0,
      imported: true,
      lastUpdatedTimestamp: new Date("2026-01-01T00:00:00.000Z"),
      ...values,
    })
  );

const snapshot = async () =>
  (await em.getRepository(Project).find({ order: { id: "ASC" } })).map(
    ({ id, description, descriptionHtml, descriptionSummary }) => ({
      id,
      description,
      descriptionHtml,
      descriptionSummary,
    })
  );

const readBackup = (): BackupEntry[] =>
  fs
    .readFileSync(backupFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

beforeAll(async () => {
  em = await getTestEntityManager();
});
afterAll(async () => {
  await closeConnection();
});
beforeEach(async () => {
  await deleteAll(em, Project);
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "devouch-cleanup-"));
  backupFile = path.join(dir, "backup.jsonl");

  // Stored by the old importer: raw converter output next to the markdown.
  await seed("gitcoin-1", "gitcoin", {
    description: MARKDOWN,
    descriptionHtml: DIRTY_HTML,
    descriptionSummary: "About us alert(1)",
  });
  // Giveth keeps its HTML in `description`.
  await seed("giveth-1", "giveth", {
    description: DIRTY_HTML,
    descriptionSummary: "About us alert(1)",
  });
  // Plain text that only looks like markup.
  await seed("rf-1", "rf", {
    description: "a < b <script>alert(1)</script>",
    descriptionSummary: "a < b",
  });
  // Already clean, and a row created by an attestation with no description.
  await seed("gitcoin-2", "gitcoin", {
    description: "plain",
    descriptionHtml: "<p>plain</p>",
    descriptionSummary: "plain",
  });
  await seed("unknown-1", "unknown", {});
});

describe("planRow", () => {
  test("uses the importer's format for each source", () => {
    expect(descriptionFormatOf("giveth")).toBe("html");
    for (const source of ["gitcoin", "gardens", "rf", "rpgf3", "other"]) {
      expect(descriptionFormatOf(source)).toBe("text");
    }
  });

  test("returns null for a row that is already clean", () => {
    expect(
      planRow({
        id: "x",
        source: "gitcoin",
        description: MARKDOWN,
        descriptionHtml: CLEAN_HTML,
        descriptionSummary: "s",
      })
    ).toBeNull();
  });
});

describe("clean-up of stored descriptions", () => {
  test("a dry run reports the rows and writes nothing", async () => {
    const before = await snapshot();
    const lines: string[] = [];
    const report = await runCleanup(em.connection, {
      apply: false,
      log: (line) => lines.push(line),
    });

    expect(report).toMatchObject({
      scanned: 4,
      needingChange: 2,
      suspicious: 2,
      updated: 0,
      bySource: { gitcoin: 1, giveth: 1 },
    });
    expect(
      lines.filter((line) => line.startsWith("WOULD UPDATE"))
    ).toHaveLength(2);
    expect(await snapshot()).toEqual(before);
    expect(fs.existsSync(backupFile)).toBe(false);
  });

  test("applying refuses to run without a backup file", async () => {
    await expect(
      runCleanup(em.connection, { apply: true, log: quiet })
    ).rejects.toThrow(/backup/);
  });

  test("applying sanitizes HTML, leaves text alone and records the old values", async () => {
    const before = await snapshot();
    const report = await runCleanup(em.connection, {
      apply: true,
      backupFile,
      batchSize: 1,
      log: quiet,
    });
    expect(report).toMatchObject({
      needingChange: 2,
      updated: 2,
      skippedConcurrent: 0,
    });

    const after = await snapshot();
    const row = (id: string) => after.find((p) => p.id === id)!;
    expect(row("gitcoin-1")).toEqual({
      id: "gitcoin-1",
      description: MARKDOWN,
      descriptionHtml: CLEAN_HTML,
      descriptionSummary: "About us",
    });
    expect(row("giveth-1")).toMatchObject({
      description: CLEAN_HTML,
      descriptionHtml: null,
      descriptionSummary: "About us",
    });
    // Untouched rows are byte-for-byte what they were.
    for (const id of ["rf-1", "gitcoin-2", "unknown-1"]) {
      expect(row(id)).toEqual(before.find((p) => p.id === id));
    }

    const backup = readBackup();
    expect(backup.map((entry) => entry.id).sort()).toEqual([
      "gitcoin-1",
      "giveth-1",
    ]);
    expect(
      backup.find((entry) => entry.id === "gitcoin-1")!.before.descriptionHtml
    ).toBe(DIRTY_HTML);
  });

  test("a second run finds nothing to change", async () => {
    await runCleanup(em.connection, { apply: true, backupFile, log: quiet });
    const afterFirst = await snapshot();

    const second = await runCleanup(em.connection, {
      apply: true,
      backupFile: path.join(dir, "second.jsonl"),
      log: quiet,
    });
    expect(second).toMatchObject({ needingChange: 0, updated: 0 });
    expect(await snapshot()).toEqual(afterFirst);
    expect(fs.existsSync(path.join(dir, "second.jsonl"))).toBe(false);
  });

  test("--source limits the run to one source", async () => {
    const report = await runCleanup(em.connection, {
      apply: true,
      backupFile,
      source: "giveth",
      log: quiet,
    });
    expect(report).toMatchObject({ scanned: 1, updated: 1 });
    const gitcoin = (await snapshot()).find((p) => p.id === "gitcoin-1")!;
    expect(gitcoin.descriptionHtml).toBe(DIRTY_HTML);
  });

  test("restore puts the recorded values back", async () => {
    const before = await snapshot();
    await runCleanup(em.connection, { apply: true, backupFile, log: quiet });

    // Dry run first: nothing changes.
    const cleaned = await snapshot();
    expect(
      await runRestore(em.connection, {
        file: backupFile,
        apply: false,
        log: quiet,
      })
    ).toEqual({ entries: 2, restored: 0, skipped: 0 });
    expect(await snapshot()).toEqual(cleaned);

    expect(
      await runRestore(em.connection, {
        file: backupFile,
        apply: true,
        log: quiet,
      })
    ).toEqual({ entries: 2, restored: 2, skipped: 0 });
    expect(await snapshot()).toEqual(before);
  });

  test("restore does not overwrite a row imported since the clean-up", async () => {
    await runCleanup(em.connection, { apply: true, backupFile, log: quiet });
    await em
      .getRepository(Project)
      .update({ id: "gitcoin-1" }, { descriptionHtml: "<p>newer</p>" });

    expect(
      await runRestore(em.connection, {
        file: backupFile,
        apply: true,
        log: quiet,
      })
    ).toEqual({ entries: 2, restored: 1, skipped: 1 });
    const gitcoin = (await snapshot()).find((p) => p.id === "gitcoin-1")!;
    expect(gitcoin.descriptionHtml).toBe("<p>newer</p>");
  });
});
