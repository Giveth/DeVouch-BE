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
//       --restore=<file> [--apply]
//
// Options: --source=<source>  --batch-size=<n>  --backup-file=<path>
//
// Safe to re-run: a row is only touched when sanitizing changes it, and the
// sanitizer returns its own output unchanged, so a second run finds nothing.

import fs from "fs";
import path from "path";
import readline from "readline";
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
}

// Markup that has no place in a description. Only used to label rows in the
// report so stored payloads stand out from ordinary formatting clean-up.
const SUSPICIOUS_MARKUP =
  /<script|<iframe|<object|<embed|<svg|<math|<style|<form|<meta|<link|<base|javascript:|vbscript:|data:text\/html|\son[a-z]+\s*=/i;

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

const appendBackup = (file: string, entries: BackupEntry[]) => {
  const fd = fs.openSync(file, "a");
  try {
    fs.writeSync(
      fd,
      entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n"
    );
    // The backup must be on disk before the rows it describes are changed.
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
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

  const report: CleanupReport = {
    scanned: 0,
    needingChange: 0,
    suspicious: 0,
    updated: 0,
    skippedConcurrent: 0,
    bySource: {},
  };

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

    const plans = rows
      .map(planRow)
      .filter((plan): plan is BackupEntry => plan !== null);
    for (const plan of plans) {
      report.needingChange++;
      report.bySource[plan.source] = (report.bySource[plan.source] ?? 0) + 1;
      const suspicious = SUSPICIOUS_MARKUP.test(
        `${plan.before.descriptionHtml ?? ""}\n${
          descriptionFormatOf(plan.source) === "html"
            ? (plan.before.description ?? "")
            : ""
        }`
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

    appendBackup(backupFile!, plans);
    // One transaction per batch: a failure leaves the batch untouched, and
    // everything before it committed and recorded in the backup file.
    await dataSource.transaction(async (manager) => {
      for (const plan of plans) {
        const result = await manager.query(
          SWAP_SQL,
          swapParams(plan.id, plan.after, plan.before)
        );
        if (affected(result) === 1) report.updated++;
        else {
          report.skippedConcurrent++;
          log(`SKIPPED ${plan.id}: changed since it was read`);
        }
      }
    });
  }

  return report;
};

export interface RestoreReport {
  entries: number;
  restored: number;
  /** Rows that no longer hold what this script wrote; left alone. */
  skipped: number;
}

// Puts back the values recorded in a backup file. A row is only restored if it
// still holds exactly what the clean-up wrote, so anything imported since is
// not overwritten with an older description.
export const runRestore = async (
  dataSource: DataSource,
  options: { file: string; apply: boolean; log?: (line: string) => void }
): Promise<RestoreReport> => {
  const log = options.log ?? console.log;
  const report: RestoreReport = { entries: 0, restored: 0, skipped: 0 };
  const lines = readline.createInterface({
    input: fs.createReadStream(options.file, "utf8"),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const entry: BackupEntry = JSON.parse(line);
    report.entries++;
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
    } else {
      report.skipped++;
      log(`SKIPPED ${entry.id}: no longer holds the cleaned-up value`);
    }
  }
  return report;
};

const parseArgs = (argv: string[]) => {
  const known = ["apply", "source", "batch-size", "backup-file", "restore"];
  const args: Record<string, string | true> = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!match || !known.includes(match[1])) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    args[match[1]] = match[2] ?? true;
  }
  const value = (name: string): string | undefined => {
    if (args[name] === true) throw new Error(`--${name} needs a value`);
    return args[name] as string | undefined;
  };
  const batchSize = value("batch-size");
  if (batchSize !== undefined && !/^[1-9]\d{0,3}$/.test(batchSize)) {
    throw new Error("--batch-size must be an integer between 1 and 9999");
  }
  return {
    apply: args.apply === true,
    source: value("source"),
    batchSize: batchSize ? Number(batchSize) : undefined,
    backupFile: value("backup-file"),
    restore: value("restore"),
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const dataSource = await getDataSource();
  if (!dataSource) throw new Error("Could not connect to the database");

  const { host, port, database } = dataSource.options as any;
  console.log(
    `Database: ${database} on ${host}:${port} - ${
      args.apply ? "APPLYING CHANGES" : "dry run, nothing is written"
    }`
  );

  try {
    if (args.restore) {
      const report = await runRestore(dataSource, {
        file: args.restore,
        apply: args.apply,
      });
      console.log(`RESTORE_SUMMARY ${JSON.stringify(report)}`);
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
      // Fail before touching any row if the backup cannot be written, and
      // never append to a file left over from another run.
      fs.closeSync(fs.openSync(backupFile, "wx"));
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
  } finally {
    await dataSource.destroy();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  });
}
