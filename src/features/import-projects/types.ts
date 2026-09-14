export interface ImportResult {
  source: string;
  ok: boolean;
  imported: number;
  error?: string;
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
