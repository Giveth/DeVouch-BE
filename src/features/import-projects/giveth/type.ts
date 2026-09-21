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
