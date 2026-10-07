// Shape of one `devouchProjectCatalog` project. `id` is a GraphQL ID, so it
// arrives as a string even though it is numeric on the Giveth side; the cursor
// parses it, the upsert lower-cases it as-is. `description` and `image` are
// nullable in the V6 schema.
export type GivethProjectInfo = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  image: string | null;
  creationDate: string;
};

// One `devouchProjectCatalog` page. `total` is the catalog-wide count of ACTIVE
// projects, and it is only ever populated on the request that asked for it
// (the first page of a walk) - `null` everywhere else, and also when the field
// came back missing or unusable. See `fetchGivethCatalogBatch` for why it is
// not requested per page and why it cannot be treated as exact.
export type GivethCatalogPage = {
  projects: GivethProjectInfo[];
  total: number | null;
};
