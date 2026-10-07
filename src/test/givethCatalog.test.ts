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

const sentQuery = (): string => mockedRequest.mock.calls[0][1];

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

    await expect(fetchGivethCatalogBatch(config, 100, 9)).resolves.toEqual({
      projects,
      total: null,
    });
    expect(mockedRequest).toHaveBeenCalledWith(
      config.url,
      expect.stringContaining("devouchProjectCatalog"),
      { take: 100, afterId: 9 },
      config.headers
    );
  });

  it("throws the GraphQL error messages (e.g. UNAUTHENTICATED) instead of returning []", async () => {
    mockedRequest.mockResolvedValue({
      data: null,
      errors: [{ message: "UNAUTHENTICATED" }, { message: "second" }],
    });

    await expect(fetchGivethCatalogBatch(config, 100, 0)).rejects.toThrow(
      "UNAUTHENTICATED; second"
    );
  });

  it("throws when the response carries no projects array", async () => {
    mockedRequest.mockResolvedValue({ data: {} });

    await expect(fetchGivethCatalogBatch(config, 100, 0)).rejects.toThrow(
      "Invalid Giveth catalog response"
    );
  });

  // `total` is resolved lazily upstream with a COUNT over the whole table, so
  // it is selected only when the caller asks - once per walk, not per page.
  it("selects total only when asked for it", async () => {
    mockedRequest.mockResolvedValue({
      data: { devouchProjectCatalog: { projects: [], total: 1234 } },
    });

    await fetchGivethCatalogBatch(config, 100, 0);
    expect(sentQuery()).not.toContain("total");

    mockedRequest.mockClear();
    await expect(
      fetchGivethCatalogBatch(config, 100, 0, { withTotal: true })
    ).resolves.toEqual({ projects: [], total: 1234 });
    expect(sentQuery()).toContain("total");
  });

  // An upstream that stops serving the optional field must not take the import
  // down with it: the completeness check skips itself on a null total.
  it.each([
    ["missing", {}],
    ["null", { total: null }],
    ["a string", { total: "1234" }],
    ["fractional", { total: 12.5 }],
    ["negative", { total: -1 }],
  ])("reports an unusable total (%s) as unavailable", async (_label, extra) => {
    mockedRequest.mockResolvedValue({
      data: { devouchProjectCatalog: { projects: [], ...extra } },
    });

    await expect(
      fetchGivethCatalogBatch(config, 100, 0, { withTotal: true })
    ).resolves.toEqual({ projects: [], total: null });
  });
});
