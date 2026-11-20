// One-off clean-up for project descriptions stored before the importer
// sanitized them. Regular imports rewrite the rows a source still lists; this
// covers the rest (sources no longer imported, projects a source dropped).
//
//   Report only (default, writes nothing):
//     node -r dotenv/config lib/scripts/sanitizeProjectDescriptions.js
//   Apply, saving the previous values first:
//     node -r dotenv/config lib/scripts/sanitizeProjectDescriptions.js --apply
//   Put the previous values back from a backup file:
//     node -r dotenv/config lib/scripts/sanitizeProjectDescriptions.js \
//       --restore=<file> [--apply] [--restore-unresolved]
//
// Options: --source=<source>  --batch-size=<n>  --backup-file=<path>
// `--source` must be one of the imported sources (giveth, gitcoin, gardens,
// rf, rpgf3); anything else is refused rather than reported as a clean run.
//
// Safe to re-run: a row is only touched when sanitizing changes it, and the
// sanitizer returns its own output unchanged, so a second run finds nothing.
//
// The backup file is a log, one JSON object per line, written in this order
// for every batch of rows:
//   1. one entry per row the batch intends to change (before/after values);
//   2. `prepared`: the id of the database transaction and the rows it did not
//      change after all - written inside the transaction, before it commits;
//   3. `committed`: written once the transaction has committed.
// Each step is on disk before the next one starts, so the file always says at
// least as much as the database did. Restore reads it back as follows:
//   - entries only          -> the transaction cannot have committed;
//   - entries + prepared    -> the run died around the commit; the database
//                              is asked whether that transaction committed.
//                              If it can no longer say (see
//                              `--restore-unresolved`), the rows are reported
//                              and left alone;
//   - entries + ... + committed -> the batch was applied.
// Only rows of an applied batch that were not listed as skipped are restored.

import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import readline from "readline";
import sanitizeHtml from "sanitize-html";
import type { DataSource } from "typeorm";
import { getDataSource } from "../helpers/db";
import { getHtmlTextSummary } from "../features/import-projects/helpers";
import {
  DescriptionFormat,
  sanitizeDescriptionFields,
} from "../features/import-projects/sanitizeDescription";
import type { SourceConfig } from "../features/import-projects/types";
import { givethSourceConfig } from "../features/import-projects/giveth/constants";
import { gitcoinSourceConfig } from "../features/import-projects/gitcoin/constants";
import { gardensSourceConfig } from "../features/import-projects/gardens/constants";
import { rfSourceConfig } from "../features/import-projects/rf/constants";
import { rlSourceConfig } from "../features/import-projects/retroList/constants";
import { rpgf3SourceConfig } from "../features/import-projects/rpgf/constants";

const SOURCE_CONFIGS: SourceConfig[] = [
  givethSourceConfig,
  gitcoinSourceConfig,
  gardensSourceConfig,
  rfSourceConfig,
  rlSourceConfig,
  rpgf3SourceConfig,
];

// The format each source's `description` was stored in, taken from the same
// configuration the importer uses. A source with no importer (a row created
// only by an attestation) is treated as text, i.e. its `description` is left
// alone; `descriptionHtml` is sanitized for every row regardless.
export const descriptionFormatOf = (source: string): DescriptionFormat =>
  SOURCE_CONFIGS.find((config) => config.source === source)
    ?.descriptionFormat ?? "text";

// The sources `--source` accepts: the ones an importer writes, which are the
// only rows whose `description` format is known.
export const SUPPORTED_SOURCES: string[] = [
  ...new Set(SOURCE_CONFIGS.map((config) => config.source)),
];

// A source that is misspelt, empty or differently cased matches no row, and a
// run over no rows reports "nothing to change". It is refused instead.
export const assertSupportedSource = (source: string): string => {
  if (!SUPPORTED_SOURCES.includes(source)) {
    throw new Error(
      `Unknown source ${JSON.stringify(source)}. Supported sources: ${SUPPORTED_SOURCES.join(
        ", "
      )}`
    );
  }
  return source;
};

type Nullable = string | null;

export interface DescriptionValues {
  description: Nullable;
  descriptionHtml: Nullable;
  descriptionSummary: Nullable;
}

export interface ProjectDescriptionRow extends DescriptionValues {
  id: string;
  source: string;
}

export interface BackupEntry {
  id: string;
  source: string;
  before: DescriptionValues;
  after: DescriptionValues;
  /** The batch the row was planned in. Absent in files written before
   *  outcomes were recorded. */
  batch?: string;
}

// The two records that follow a batch's entries; see the top of the file.
interface PreparedRecord {
  batch: string;
  prepared: {
    txid: string;
    skipped: string[];
    /** The database cluster `txid` belongs to, when it could be read. */
    system?: string;
  };
}
interface CommittedRecord {
  batch: string;
  committed: true;
}

// Markup that has no place in a description. Only used to label rows in the
// report, so stored payloads stand out from ordinary formatting clean-up.
//
// Everything here is looked for in markup, never in the words of the
// description: a sentence that mentions "javascript:" or contains "on =" is
// not a payload.
const SUSPICIOUS_TAGS = [
  "script",
  "object",
  "embed",
  "svg",
  "math",
  "style",
  "form",
  "meta",
  "link",
  "base",
];
const HANDLER_ATTRIBUTE = /^on[a-z]/i;
const SCRIPT_URL = /^(?:javascript|vbscript):|^data:text\/html/i;
const SCRIPT_URL_IN_STYLE = /(?:javascript|vbscript):|data:text\/html/i;
// Browsers ignore whitespace and control characters inside a URL scheme.
const compactUrl = (value: string) => value.replace(/[\u0000-\u0020]+/g, "");

// The parser is the one the sanitizer uses, so a tag or attribute counts here
// exactly when the sanitizer would have seen it. Attribute values arrive with
// their entities decoded, which also catches `&#106;avascript:`.
const hasSuspiciousElement = (html: string): boolean => {
  let found = false;
  sanitizeHtml(html, {
    allowedTags: false,
    allowedAttributes: false,
    allowVulnerableTags: true,
    transformTags: {
      "*": (tagName, attribs) => {
        found ||=
          SUSPICIOUS_TAGS.includes(tagName.toLowerCase()) ||
          Object.entries(attribs).some(
            ([name, value]) =>
              HANDLER_ATTRIBUTE.test(name) ||
              name.toLowerCase() === "srcdoc" ||
              (name.toLowerCase() === "style"
                ? SCRIPT_URL_IN_STYLE.test(compactUrl(value))
                : SCRIPT_URL.test(compactUrl(value)))
          );
        return { tagName, attribs };
      },
    },
  });
  return found;
};

// A tag that is never closed (`<img src=x onerror=...` at the end of a value)
// is not reported by the parser, but it is still an attempt. Closing it - on
// its own, or after ending a quoted value it stopped in - hands it to the same
// parser, so it is judged by its attribute names and values like any other
// tag, and text inside a quoted value is never mistaken for an attribute.
// Where the value does not end inside a tag, the added characters are text.
const UNCLOSED_TAG_ENDINGS = [">", '">', "'>"];

const count = (text: string, pattern: RegExp) =>
  (text.match(pattern) ?? []).length;

// Video embeds are ordinary content, so an iframe only counts when the
// clean-up removes one that pointed somewhere.
export const isSuspicious = (before: string, after: string): boolean =>
  hasSuspiciousElement(before) ||
  UNCLOSED_TAG_ENDINGS.some((ending) =>
    hasSuspiciousElement(before + ending)
  ) ||
  count(before, /<iframe\b[^>]*\ssrc\s*=\s*["']?[^"'\s>]/gi) >
    count(after, /<iframe\b/gi);

// Returns the values a row should hold, or null when it is already clean.
export const planRow = (row: ProjectDescriptionRow): BackupEntry | null => {
  const { description, descriptionHtml } = sanitizeDescriptionFields(
    { description: row.description, descriptionHtml: row.descriptionHtml },
    descriptionFormatOf(row.source)
  );
  if (
    description === row.description &&
    descriptionHtml === row.descriptionHtml
  ) {
    return null;
  }
  return {
    id: row.id,
    source: row.source,
    before: {
      description: row.description,
      descriptionHtml: row.descriptionHtml,
      descriptionSummary: row.descriptionSummary,
    },
    after: {
      description,
      descriptionHtml: descriptionHtml ?? null,
      // Same derivation as the importer, from the sanitized value.
      descriptionSummary: getHtmlTextSummary(
        descriptionHtml || description || ""
      ),
    },
  };
};

export interface CleanupOptions {
  apply: boolean;
  batchSize?: number;
  source?: string;
  /** Required with `apply`: where the previous values are appended. */
  backupFile?: string;
  log?: (line: string) => void;
}

export interface CleanupReport {
  scanned: number;
  needingChange: number;
  suspicious: number;
  updated: number;
  /** Rows that changed between being read and being written; left alone. */
  skippedConcurrent: number;
  /** Rows that could not be sanitized; left alone and reported. */
  failed: number;
  bySource: Record<string, number>;
}

// Rewrites `expected -> next` for one row, only if the row still holds
// `expected`. The importer runs alongside this script and may have written a
// newer value in the meantime; that value wins.
const SWAP_SQL = `
  UPDATE "project"
     SET "description" = $2, "description_html" = $3, "description_summary" = $4
   WHERE "id" = $1
     AND "description" IS NOT DISTINCT FROM $5
     AND "description_html" IS NOT DISTINCT FROM $6
     AND "description_summary" IS NOT DISTINCT FROM $7
  RETURNING "id"`;

const swapParams = (
  id: string,
  next: DescriptionValues,
  expected: DescriptionValues
) => [
  id,
  next.description,
  next.descriptionHtml,
  next.descriptionSummary,
  expected.description,
  expected.descriptionHtml,
  expected.descriptionSummary,
];

// typeorm's postgres driver returns `[rows, affectedCount]` for UPDATE.
const affected = (result: any): number =>
  Array.isArray(result) && typeof result[1] === "number"
    ? result[1]
    : Array.isArray(result)
      ? result.length
      : 0;

// Writes all of `data`. A single `writeSync` may accept only part of what it
// is given and report how much; carrying on from there is the caller's job.
const writeAll = (fd: number, data: Buffer) => {
  let offset = 0;
  while (offset < data.length) {
    const written = fs.writeSync(fd, data, offset, data.length - offset);
    if (!(written > 0)) {
      throw new Error(
        `Could not write the backup: ${offset} of ${data.length} bytes were accepted`
      );
    }
    offset += written;
  }
};

// Appends records to the backup file and returns only once they are on disk.
// Anything that goes wrong is thrown: the caller must not go on to change
// what these records describe.
const appendBackup = (file: string, records: object[]) => {
  const fd = fs.openSync(file, "a", 0o600);
  try {
    writeAll(
      fd,
      Buffer.from(
        records.map((record) => JSON.stringify(record)).join("\n") + "\n",
        "utf8"
      )
    );
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
};

// Identifies the database cluster. Transaction ids are only meaningful
// within the cluster that issued them: another one may well have a committed
// transaction with the same number. Not being able to read it is not a
// reason to refuse the clean-up; the id is then recorded without it.
const systemIdentifier = async (
  dataSource: DataSource
): Promise<string | undefined> => {
  try {
    const [{ system }] = await dataSource.query(
      `SELECT system_identifier::text AS "system" FROM pg_control_system()`
    );
    return typeof system === "string" ? system : undefined;
  } catch {
    return undefined;
  }
};

// Creates the backup file, which must not exist yet: a run never appends to
// a file left over from another one. The new name is flushed to disk as well
// - flushing the file alone does not guarantee that its directory entry
// survives a crash, and the rows would then be changed with no backup to be
// found. Throws, before any row is touched, if either step fails.
export const createBackupFile = (file: string) => {
  const fd = fs.openSync(file, "wx", 0o600);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const directory = fs.openSync(path.dirname(file), "r");
  try {
    fs.fsyncSync(directory);
  } finally {
    fs.closeSync(directory);
  }
};

export const runCleanup = async (
  dataSource: DataSource,
  options: CleanupOptions
): Promise<CleanupReport> => {
  const { apply, source, backupFile } = options;
  const batchSize = options.batchSize ?? 200;
  const log = options.log ?? console.log;
  if (apply && !backupFile) {
    throw new Error("--apply needs a backup file");
  }
  if (source !== undefined) assertSupportedSource(source);

  const report: CleanupReport = {
    scanned: 0,
    needingChange: 0,
    suspicious: 0,
    updated: 0,
    skippedConcurrent: 0,
    failed: 0,
    bySource: {},
  };

  const system = apply ? await systemIdentifier(dataSource) : undefined;

  // Keyset pagination on the primary key: stable while rows are being
  // rewritten, and never holds more than one batch in memory.
  let lastId = "";
  for (;;) {
    const rows: ProjectDescriptionRow[] = await dataSource.query(
      `SELECT "id", "source", "description",
              "description_html" AS "descriptionHtml",
              "description_summary" AS "descriptionSummary"
         FROM "project"
        WHERE "id" > $1
          AND ("description" IS NOT NULL OR "description_html" IS NOT NULL)
          AND ($2::text IS NULL OR "source" = $2)
        ORDER BY "id" ASC
        LIMIT $3`,
      [lastId, source ?? null, batchSize]
    );
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;
    report.scanned += rows.length;

    const plans: BackupEntry[] = [];
    for (const row of rows) {
      try {
        const plan = planRow(row);
        if (plan) plans.push(plan);
      } catch (error: any) {
        // One row that cannot be processed must not stop the others. It is
        // left exactly as it is and counted, so the run is not reported clean.
        report.failed++;
        log(`FAILED ${row.id}: ${error?.message ?? error}`);
      }
    }
    const html = (values: DescriptionValues, source: string) =>
      `${values.descriptionHtml ?? ""}\n${
        descriptionFormatOf(source) === "html" ? (values.description ?? "") : ""
      }`;
    for (const plan of plans) {
      report.needingChange++;
      report.bySource[plan.source] = (report.bySource[plan.source] ?? 0) + 1;
      const suspicious = isSuspicious(
        html(plan.before, plan.source),
        html(plan.after, plan.source)
      );
      if (suspicious) report.suspicious++;
      const size = (values: DescriptionValues) =>
        `${values.description?.length ?? "-"}/${
          values.descriptionHtml?.length ?? "-"
        }`;
      log(
        `${apply ? "UPDATE" : "WOULD UPDATE"} ${plan.id} ` +
          `chars(description/html) ${size(plan.before)} -> ${size(plan.after)}` +
          (suspicious ? " SUSPICIOUS" : "")
      );
    }

    if (!apply || plans.length === 0) continue;

    const batch = randomUUID();
    appendBackup(
      backupFile!,
      plans.map((plan): BackupEntry => ({ ...plan, batch }))
    );
    // One transaction per batch: a failure leaves the batch untouched, and
    // everything before it committed and recorded in the backup file.
    await dataSource.transaction(async (manager) => {
      const [{ txid }] = await manager.query(
        `SELECT txid_current()::text AS "txid"`
      );
      const skipped: string[] = [];
      for (const plan of plans) {
        const result = await manager.query(
          SWAP_SQL,
          swapParams(plan.id, plan.after, plan.before)
        );
        if (affected(result) === 1) report.updated++;
        else {
          report.skippedConcurrent++;
          skipped.push(plan.id);
          log(`SKIPPED ${plan.id}: changed since it was read`);
        }
      }
      // Last thing before the commit, and on disk before it: which rows this
      // transaction left alone, and the id the database knows it by. If this
      // cannot be written the transaction is rolled back.
      const prepared: PreparedRecord = {
        batch,
        prepared: { txid, skipped, ...(system ? { system } : {}) },
      };
      appendBackup(backupFile!, [prepared]);
    });
    // The transaction committed. Should the run die before this line is
    // written, restore asks the database about `txid` instead.
    const committed: CommittedRecord = { batch, committed: true };
    appendBackup(backupFile!, [committed]);
  }

  return report;
};

export interface RestoreReport {
  entries: number;
  restored: number;
  /** Rows that already hold the recorded previous values. */
  alreadyRestored: number;
  /** Rows that hold neither recorded value (changed since); left alone. */
  skipped: number;
  /** Rows the clean-up listed but did not change; left alone. */
  notApplied: number;
  /** Rows of a batch whose outcome could not be established; left alone. */
  unresolved: number;
}

const isValues = (value: any): value is DescriptionValues =>
  !!value &&
  ["description", "descriptionHtml", "descriptionSummary"].every(
    (key) => value[key] === null || typeof value[key] === "string"
  );

const isEntry = (value: any): value is BackupEntry =>
  !!value &&
  typeof value.id === "string" &&
  isValues(value.before) &&
  isValues(value.after) &&
  (value.batch === undefined || typeof value.batch === "string");

const isPrepared = (value: any): value is PreparedRecord =>
  !!value &&
  typeof value.batch === "string" &&
  !!value.prepared &&
  typeof value.prepared.txid === "string" &&
  /^\d{1,20}$/.test(value.prepared.txid) &&
  Array.isArray(value.prepared.skipped) &&
  value.prepared.skipped.every((id: unknown) => typeof id === "string") &&
  (value.prepared.system === undefined ||
    typeof value.prepared.system === "string");

const isCommitted = (value: any): value is CommittedRecord =>
  !!value && typeof value.batch === "string" && value.committed === true;

interface BatchOutcome {
  txid: string;
  system?: string;
  skipped: Set<string>;
  committed: boolean;
}

interface Backup {
  entries: BackupEntry[];
  /** Batches that got as far as their `prepared` record. */
  batches: Map<string, BatchOutcome>;
}

// Whether the file's last byte is a line feed. Every record is written with
// one after it, so a last line without it was cut short.
const endsWithNewline = (file: string): boolean => {
  const fd = fs.openSync(file, "r");
  try {
    const { size } = fs.fstatSync(fd);
    if (size === 0) return false;
    const last = Buffer.alloc(1);
    fs.readSync(fd, last, 0, 1, size - 1);
    return last[0] === 0x0a;
  } finally {
    fs.closeSync(fd);
  }
};

// Reads a backup file, checking every line before any of them is used. Every
// write is flushed before the next step is taken, so the only line that can
// legitimately be cut short is the last one, written when the run was
// interrupted - and a line that was cut short has no line feed after it.
// Anything else that does not parse, a complete last line included, means
// the file is damaged or is not a backup this script wrote.
const readBackupFile = async (
  file: string,
  log: (line: string) => void
): Promise<Backup> => {
  const entries: BackupEntry[] = [];
  const batches = new Map<string, BatchOutcome>();
  let lineNumber = 0;
  let invalidLine = 0;
  const lines = readline.createInterface({
    input: fs.createReadStream(file, "utf8"),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    lineNumber++;
    if (!line.trim()) continue;
    if (invalidLine) {
      throw new Error(
        `${file}: line ${invalidLine} is not a backup entry; nothing was restored`
      );
    }
    let record: any;
    try {
      record = JSON.parse(line);
    } catch {
      record = null;
    }
    if (isEntry(record)) {
      entries.push(record);
    } else if (isPrepared(record)) {
      batches.set(record.batch, {
        txid: record.prepared.txid,
        system: record.prepared.system,
        skipped: new Set(record.prepared.skipped),
        committed: false,
      });
    } else if (isCommitted(record) && batches.has(record.batch)) {
      batches.get(record.batch)!.committed = true;
    } else {
      invalidLine = lineNumber;
    }
  }
  if (invalidLine && endsWithNewline(file)) {
    throw new Error(
      `${file}: line ${invalidLine} is not a backup entry; nothing was restored`
    );
  }
  if (invalidLine) {
    // A cut-short line is treated as never written. That is the safe reading
    // for each kind: entries without `prepared` were not applied, and a
    // missing `committed` is settled by asking the database.
    log(
      `WARNING: ignoring incomplete last line ${invalidLine} of ${file} (interrupted run)`
    );
  }
  return { entries, batches };
};

export const readBackup = async (
  file: string,
  log: (line: string) => void = console.log
): Promise<BackupEntry[]> => (await readBackupFile(file, log)).entries;

type BatchState = "applied" | "not-applied" | "unresolved";

// Whether the transaction of a batch that never recorded its commit did
// commit. PostgreSQL keeps that answer for exactly this purpose. It cannot
// give one for a transaction id it does not know - a status it no longer
// keeps, or an id issued by another cluster, where the same number may belong
// to an unrelated transaction. Those are reported, never guessed.
const transactionState = async (
  dataSource: DataSource,
  outcome: BatchOutcome
): Promise<BatchState> => {
  try {
    if (
      outcome.system !== undefined &&
      outcome.system !== (await systemIdentifier(dataSource))
    ) {
      return "unresolved";
    }
    const [{ status }] = await dataSource.query(
      `SELECT txid_status($1::bigint) AS "status"`,
      [outcome.txid]
    );
    if (status === "committed") return "applied";
    if (status === "aborted") return "not-applied";
    return "unresolved";
  } catch {
    return "unresolved";
  }
};

// Puts back the values recorded in a backup file - for the rows the clean-up
// actually changed, and nothing else. A row the clean-up listed but then left
// alone (it had changed in the meantime, or its batch never committed) may
// since have been given the very same sanitized values by the importer;
// those are the importer's, and are not replaced with an older description.
// A row the clean-up did change is only restored while it still holds exactly
// what the clean-up wrote. Safe to re-run.
//
// `restoreUnresolved` is for a batch whose outcome the database can no longer
// confirm. Its rows are normally left alone. With this option they are
// restored on the evidence of the row alone: it holds exactly what the
// clean-up meant to write. That cannot tell the clean-up's write from an
// identical one by the importer, which is why it has to be asked for.
export const runRestore = async (
  dataSource: DataSource,
  options: {
    file: string;
    apply: boolean;
    restoreUnresolved?: boolean;
    log?: (line: string) => void;
  }
): Promise<RestoreReport> => {
  const log = options.log ?? console.log;
  const { entries, batches } = await readBackupFile(options.file, log);
  const report: RestoreReport = {
    entries: entries.length,
    restored: 0,
    alreadyRestored: 0,
    skipped: 0,
    notApplied: 0,
    unresolved: 0,
  };

  const states = new Map<string, BatchState>();
  const stateOf = async (batch: string): Promise<BatchState> => {
    if (!states.has(batch)) {
      const outcome = batches.get(batch);
      states.set(
        batch,
        !outcome
          ? "not-applied"
          : outcome.committed
            ? "applied"
            : await transactionState(dataSource, outcome)
      );
    }
    return states.get(batch)!;
  };

  for (const entry of entries) {
    // An entry without a batch comes from a file written before outcomes
    // were recorded. All there is to go by is the row itself.
    if (entry.batch !== undefined) {
      // The skip list is checked first: a row the transaction left alone
      // needs no restoring whether or not that transaction committed.
      const state = batches.get(entry.batch)?.skipped.has(entry.id)
        ? "not-applied"
        : await stateOf(entry.batch);
      if (state === "not-applied") {
        report.notApplied++;
        log(`NOT APPLIED ${entry.id}: the clean-up did not change this row`);
        continue;
      }
      if (state === "unresolved" && !options.restoreUnresolved) {
        report.unresolved++;
        log(
          `UNRESOLVED ${entry.id}: cannot tell whether transaction ${
            batches.get(entry.batch)!.txid
          } committed in this database; left alone`
        );
        continue;
      }
    }
    if (!options.apply) {
      log(`WOULD RESTORE ${entry.id}`);
      continue;
    }
    const result = await dataSource.query(
      SWAP_SQL,
      swapParams(entry.id, entry.before, entry.after)
    );
    if (affected(result) === 1) {
      report.restored++;
      log(`RESTORED ${entry.id}`);
      continue;
    }
    const [current]: DescriptionValues[] = await dataSource.query(
      `SELECT "description", "description_html" AS "descriptionHtml",
              "description_summary" AS "descriptionSummary"
         FROM "project" WHERE "id" = $1`,
      [entry.id]
    );
    const holdsPrevious =
      !!current &&
      current.description === entry.before.description &&
      current.descriptionHtml === entry.before.descriptionHtml &&
      current.descriptionSummary === entry.before.descriptionSummary;
    if (holdsPrevious) {
      report.alreadyRestored++;
      log(`UNCHANGED ${entry.id}: already holds the previous value`);
    } else {
      report.skipped++;
      log(
        `SKIPPED ${entry.id}: ${
          current ? "changed since the clean-up" : "row no longer exists"
        }`
      );
    }
  }
  return report;
};

export const parseArgs = (argv: string[]) => {
  const known = [
    "apply",
    "source",
    "batch-size",
    "backup-file",
    "restore",
    "restore-unresolved",
  ];
  const args: Record<string, string | true> = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!match || !known.includes(match[1])) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    if (match[1] in args) throw new Error(`--${match[1]} was given twice`);
    args[match[1]] = match[2] ?? true;
  }
  // `--apply=false` would otherwise read as "not applying" by accident, and
  // `--apply=true` as a dry run.
  for (const flag of ["apply", "restore-unresolved"]) {
    if (args[flag] !== undefined && args[flag] !== true) {
      throw new Error(`--${flag} takes no value`);
    }
  }
  // An empty value is refused like a missing one. `--restore=$FILE` with
  // the variable unset must not turn into a clean-up run.
  const value = (name: string): string | undefined => {
    if (args[name] === true || args[name] === "") {
      throw new Error(`--${name} needs a value`);
    }
    return args[name] as string | undefined;
  };
  const batchSize = value("batch-size");
  if (batchSize !== undefined && !/^[1-9]\d{0,3}$/.test(batchSize)) {
    throw new Error("--batch-size must be an integer between 1 and 9999");
  }
  if (args.restore !== undefined) {
    for (const name of ["source", "batch-size", "backup-file"]) {
      if (args[name] !== undefined) {
        throw new Error(`--${name} cannot be combined with --restore`);
      }
    }
  } else if (args["restore-unresolved"] !== undefined) {
    throw new Error("--restore-unresolved needs --restore");
  }
  const source = value("source");
  if (source !== undefined) assertSupportedSource(source);
  return {
    apply: args.apply === true,
    source,
    batchSize: batchSize ? Number(batchSize) : undefined,
    backupFile: value("backup-file"),
    restore: value("restore"),
    restoreUnresolved: args["restore-unresolved"] === true,
  };
};

export const main = async (argv: string[]) => {
  // Parsed before connecting: a mistyped flag must not reach the database.
  const args = parseArgs(argv);
  const dataSource = await getDataSource();
  if (!dataSource) throw new Error("Could not connect to the database");

  const { host, port, database } = dataSource.options as any;
  console.log(
    `Database: ${database} on ${host}:${port} - ${
      args.apply ? "APPLYING CHANGES" : "dry run, nothing is written"
    }`
  );

  try {
    if (args.restore !== undefined) {
      const report = await runRestore(dataSource, {
        file: args.restore,
        apply: args.apply,
        restoreUnresolved: args.restoreUnresolved,
      });
      console.log(`RESTORE_SUMMARY ${JSON.stringify(report)}`);
      if (report.unresolved > 0) {
        process.exitCode = 1;
        console.error(
          `${report.unresolved} row(s) were left alone: it could not be established whether their batch committed in this database. To restore those that still hold exactly what the clean-up wrote, add --restore-unresolved.`
        );
      }
      return;
    }

    const backupFile = args.apply
      ? path.resolve(
          args.backupFile ??
            `project-descriptions-backup-${new Date()
              .toISOString()
              .replace(/[:.]/g, "-")}.jsonl`
        )
      : undefined;
    if (backupFile) {
      // Fail before touching any row if the backup cannot be written.
      createBackupFile(backupFile);
      console.log(`Previous values are saved to ${backupFile}`);
    }

    const report = await runCleanup(dataSource, {
      apply: args.apply,
      source: args.source,
      batchSize: args.batchSize,
      backupFile,
    });
    console.log(`CLEANUP_SUMMARY ${JSON.stringify(report)}`);
    if (!args.apply && report.needingChange > 0) {
      console.log("Dry run only. Re-run with --apply to write these changes.");
    }
    if (report.failed > 0) {
      process.exitCode = 1;
      console.error(`${report.failed} row(s) could not be processed.`);
    }
  } finally {
    await dataSource.destroy();
  }
};

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  });
}
