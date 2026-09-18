import { type DataSource } from "typeorm";
import { Project } from "../../model";
import { getDataSource } from "../../helpers/db";
import { DESCRIPTION_SUMMARY_LENGTH } from "../../constants";
import { convert } from "html-to-text";
import {
  ImportResult,
  ImportTally,
  ProjectImportOutcome,
  SourceConfig,
} from "./types";

export const emptyTally = (): ImportTally => ({
  written: 0,
  unchanged: 0,
  skipped: 0,
  failed: 0,
});

export const recordOutcome = (
  tally: ImportTally,
  outcome: ProjectImportOutcome
): ImportTally => {
  switch (outcome) {
    case "created":
    case "updated":
      tally.written++;
      break;
    case "unchanged":
      tally.unchanged++;
      break;
    case "skipped":
      tally.skipped++;
      break;
    case "failed":
      tally.failed++;
      break;
  }
  return tally;
};

// Records one project into `tally`, converting any unexpected throw into a
// "failed" outcome. Without this a throw escapes the batch helper and the whole
// batch's accumulated tally is lost, so IMPORT_SUMMARY under-reports the
// projects that did succeed before the failure.
export const recordProject = async (
  tally: ImportTally,
  project: any,
  sourceConfig: SourceConfig
): Promise<ImportTally> => {
  try {
    recordOutcome(tally, await updateOrCreateProject(project, sourceConfig));
  } catch (error: any) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Unexpected failure importing ${
        sourceConfig.source
      } project: ${error?.message ?? error}`
    );
    recordOutcome(tally, "failed");
  }
  return tally;
};

export const addTally = (into: ImportTally, from: ImportTally): ImportTally => {
  into.written += from.written;
  into.unchanged += from.unchanged;
  into.skipped += from.skipped;
  into.failed += from.failed;
  return into;
};

export const inspected = (tally: ImportTally): number =>
  tally.written + tally.unchanged + tally.skipped + tally.failed;

const describe = (tally: ImportTally): string =>
  `${inspected(tally)} inspected (${tally.written} written, ${
    tally.unchanged
  } unchanged, ${tally.skipped} skipped, ${tally.failed} failed)`;

// A run that finished its pages still fails if any individual write failed:
// those are logged rather than thrown, so the tally is the only signal.
export const finishImport = (
  source: string,
  tally: ImportTally
): ImportResult => {
  if (tally.failed > 0) {
    const error = `${tally.failed} project(s) failed to persist`;
    console.log(
      `[${new Date().toISOString()}] - ERROR: ${source} import incomplete: ${describe(
        tally
      )}`
    );
    return { source, ok: false, ...tally, error };
  }

  console.log(`${source} import completed: ${describe(tally)}`);
  return { source, ok: true, ...tally };
};

// A source that is not configured in this environment did no work, but nothing
// went wrong: report `ok` with a note so alerting keyed on `ok` is not held
// permanently red by an optional integration nobody enabled.
export const skipImport = (source: string, note: string): ImportResult => {
  console.log(`${source} import skipped: ${note}`);
  return { source, ok: true, ...emptyTally(), note };
};

// Aborted part-way: report the tally accumulated so far so a truncated run is
// distinguishable from a complete one.
export const abortImport = (
  source: string,
  tally: ImportTally,
  error: any
): ImportResult => {
  console.log(
    `[${new Date().toISOString()}] - ERROR: ${source} import aborted after ${describe(
      tally
    )}:`,
    error?.message ?? error
  );
  return {
    source,
    ok: false,
    ...tally,
    error: error?.message ?? String(error),
  };
};

const areTimestampsEqual = (
  timestamp1: Date | null | undefined,
  timestamp2: Date | null | undefined
) => {
  if (!timestamp1 || !timestamp2) {
    return timestamp1 == timestamp2; // Handles the case where one or both are null/undefined
  }
  return new Date(timestamp1).getTime() === new Date(timestamp2).getTime();
};

const areValuesEqual = (
  value1: string | null | undefined,
  value2: string | null | undefined
) => {
  return value1 == value2; // Handles null, undefined, and string comparisons
};

// Returns whether the project reached the database. Persistence failures are
// logged rather than thrown, so callers that count imported projects must use
// this result - otherwise a run where every write failed still looks complete.
export const updateOrCreateProject = async (
  project: any,
  sourceConfig: SourceConfig
): Promise<ProjectImportOutcome> => {
  const {
    source,
    idField,
    titleField,
    descriptionField,
    descriptionHtmlField,
    urlField,
    imageField,
    rfRoundField,
    prelimResult,
    sourceCreatedAtField,
  } = sourceConfig;

  const projectId = project[idField].toLowerCase();
  const id = `${source}-${projectId}`;

  const dataSource = await getDataSource();
  if (!dataSource) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Failed to UPSERT project. Data source not found. Project ID: ${id}`
    );
    return "failed";
  }

  // Read failures must become a recorded outcome, not a thrown exception: a
  // throw here escapes the batch helper, so the tally it had accumulated for
  // the rest of the batch is discarded and IMPORT_SUMMARY under-reports the
  // projects that did succeed.
  let existingProject: Project | null;
  try {
    existingProject = await dataSource
      .getRepository(Project)
      .createQueryBuilder("project")
      .where("project.id = :id", { id })
      .getOne();
  } catch (error: any) {
    console.log(
      `[${new Date().toISOString()}] - ERROR: Failed to read project. Project ID: ${id}, Error: ${error.message}`
    );
    return "failed";
  }

  const title = project[titleField];
  const description = project[descriptionField];
  const url = project[urlField];
  const image = project[imageField];
  const descriptionHtml = descriptionHtmlField && project[descriptionHtmlField];
  const rfRound = rfRoundField && project[rfRoundField];
  const sourceCreatedAt = sourceCreatedAtField && project[sourceCreatedAtField];

  // Skip project if prelimResult is "Remove"
  if (prelimResult && project[prelimResult] === "Remove") {
    return "skipped";
  }

  const descriptionSummary = getHtmlTextSummary(descriptionHtml || description);

  if (existingProject) {
    const changes: string[] = [];

    // Check for specific field changes and log them
    if (existingProject.title !== title)
      changes.push(`title: "${existingProject.title}" -> "${title}"`);
    if (existingProject.description !== description)
      changes.push(
        `description: "${existingProject.description}" -> "${description}"`
      );
    if (existingProject.url !== url)
      changes.push(`url: "${existingProject.url}" -> "${url}"`);
    if (existingProject.image !== image)
      changes.push(`image: "${existingProject.image}" -> "${image}"`);
    if (!areValuesEqual(existingProject.descriptionHtml, descriptionHtml))
      changes.push(`descriptionHtml changed`);
    if (!existingProject.descriptionSummary && description)
      changes.push(`descriptionSummary set`);
    if (!areTimestampsEqual(existingProject.sourceCreatedAt, sourceCreatedAt))
      changes.push(
        `sourceCreatedAt: "${existingProject.sourceCreatedAt}" -> "${sourceCreatedAt}"`
      );
    if (rfRound && !existingProject.rfRounds?.some((rfr) => rfr === rfRound)) {
      changes.push(`rfRound added: "${rfRound}"`);
    }

    if (changes.length === 0) {
      // Up to date: no SQL is issued, so this must not be counted as a write.
      return "unchanged";
    }

    {
      // Add the current round to rfRounds if not already present
      const rfRoundsSet = new Set(existingProject.rfRounds || []);
      if (rfRound) {
        rfRoundsSet.add(rfRound);
      }

      const updatedProject = {
        ...existingProject,
        title,
        description,
        image,
        url,
        descriptionHtml,
        descriptionSummary,
        lastUpdatedTimestamp: new Date(),
        rfRounds: Array.from(rfRoundsSet),
        sourceCreatedAt,
        imported: true,
      };

      try {
        await dataSource
          .createQueryBuilder()
          .update(Project)
          .set(updatedProject)
          .where("id = :id", { id })
          .execute();

        console.log(
          `[${new Date().toISOString()}] - INFO: Project Updated. Project ID: ${id}. Changes: ${changes.join(", ")}`
        );
        return "updated";
      } catch (error: any) {
        console.log(
          `[${new Date().toISOString()}] - ERROR: Failed to update project. Project ID: ${id}, Error: ${error.message}`
        );
        return "failed";
      }
    }
  } else {
    // Create new project
    const newProject = new Project({
      id,
      title,
      description,
      image,
      url,
      descriptionHtml,
      descriptionSummary,
      projectId,
      source,
      rfRounds: rfRound ? [rfRound] : [],
      totalVouches: 0,
      totalFlags: 0,
      totalAttests: 0,
      sourceCreatedAt,
      lastUpdatedTimestamp: new Date(),
      imported: true,
    });

    try {
      await dataSource
        .createQueryBuilder()
        .insert()
        .into(Project)
        .values([newProject])
        .execute();

      console.log(
        `[${new Date().toISOString()}] - INFO: Project Created. Project ID: ${id}`
      );
      return "created";
    } catch (error: any) {
      console.log(
        `[${new Date().toISOString()}] - ERROR: Failed to create project. Project ID: ${id}, Error: ${error.message}`
      );
      return "failed";
    }
  }
};

const getHtmlTextSummary = (
  html: string = "",
  lengthLimit: number = DESCRIPTION_SUMMARY_LENGTH
): string => {
  const text = convert(html, {
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  })
    .replace(/^\n+/, "") // Remove new lines from the beginning
    .replace(/\n{2,}/g, "\n") // Replace multiple \n with single one
    .replace(/\n$/, ""); // Remove new line from the end

  switch (true) {
    case text.length <= lengthLimit:
      return text;
    case lengthLimit < 3:
      return ".".repeat(Math.max(0, lengthLimit));
    default:
      return text.slice(0, lengthLimit - 3) + "...";
  }
};
