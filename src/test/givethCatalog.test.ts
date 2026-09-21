import { fetchGivethCatalogBatch } from "../features/import-projects/giveth/service";
import { graphQLRequest } from "../helpers/request";

jest.mock("../helpers/request");
const mockedRequest = graphQLRequest as jest.MockedFunction<
  typeof graphQLRequest
>;

const config = {
  url: "https://core.example.test/graphql",
  headers: { Authorization: "Basic dGVzdA==" },
};

// The catalog is the only Giveth source, and the importer treats an empty page
// as end-of-data. These pin the two failure branches that must throw instead
// of returning [] so a failed page is never reported as a completed import.
describe("fetchGivethCatalogBatch", () => {
  beforeEach(() => mockedRequest.mockReset());

  it("sends the configured url and headers and returns the page", async () => {
    const projects = [{ id: "10", title: "A", slug: "a" }];
    mockedRequest.mockResolvedValue({
      data: { devouchProjectCatalog: { projects } },
    });

    await expect(fetchGivethCatalogBatch(config, 50, 9)).resolves.toEqual(
      projects
    );
    expect(mockedRequest).toHaveBeenCalledWith(
      config.url,
      expect.stringContaining("devouchProjectCatalog"),
      { take: 50, afterId: 9 },
      config.headers
    );
  });

  it("throws the GraphQL error messages (e.g. UNAUTHENTICATED) instead of returning []", async () => {
    mockedRequest.mockResolvedValue({
      data: null,
      errors: [{ message: "UNAUTHENTICATED" }, { message: "second" }],
    });

    await expect(fetchGivethCatalogBatch(config, 50, 0)).rejects.toThrow(
      "UNAUTHENTICATED; second"
    );
  });

  it("throws when the response carries no projects array", async () => {
    mockedRequest.mockResolvedValue({ data: {} });

    await expect(fetchGivethCatalogBatch(config, 50, 0)).rejects.toThrow(
      "Invalid Giveth catalog response"
    );
  });
});
