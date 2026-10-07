// What `updateOrCreateProject` actually did. A boolean could not distinguish
// "wrote a row" from "inspected an unchanged row and issued no SQL", which made
// any count built on it unusable for detecting a database that accepts reads
// but rejects writes.
export type ProjectImportOutcome =
  "created" | "updated" | "unchanged" | "skipped" | "failed";

export interface ImportTally {
  /** Rows actually inserted or updated. */
  written: number;
  /** Rows already up to date - inspected, no SQL issued. */
  unchanged: number;
  /** Rows deliberately not imported (e.g. prelimResult "Remove"). */
  skipped: number;
  /** Rows whose write was attempted and failed. */
  failed: number;
}

export interface ImportResult extends ImportTally {
  source: string;
  ok: boolean;
  error?: string;
  /**
   * Why a source did no work despite succeeding - e.g. it is not configured in
   * this environment. Distinct from `error`: a run carrying only a `note` is
   * still `ok`, so alerting keyed on `ok` does not fire on a deliberate
   * non-configuration.
   */
  note?: string;
  /**
   * Rows hidden from the listings because the source's complete catalog no
   * longer lists them. Only sources that reconcile report this; absent is not
   * the same as 0 (a source that never hides anything vs. one that found
   * nothing to hide).
   */
  deactivated?: number;
}

export interface SourceConfig {
  source: string;
  idField: string;
  titleField: string;
  descriptionField: string;
  descriptionHtmlField?: string;
  urlField: string;
  imageField: string;
  rfRoundField?: string;
  prelimResult?: string;
  sourceCreatedAtField?: string;
}
