// The config is read at module load, so each case needs a fresh module
// registry with the env already set.
const GIVETH_ENV = [
  "GIVETH_API_URL",
  "GIVETH_API_USERNAME",
  "GIVETH_API_PASSWORD",
] as const;

type Loaded =
  (typeof import("../features/import-projects/giveth/constants"))["givethCatalogConfig"];

const loadConfig = (env: Record<string, string | undefined>): Loaded => {
  const previous = Object.fromEntries(
    GIVETH_ENV.map((key) => [key, process.env[key]])
  );
  for (const key of GIVETH_ENV) delete process.env[key];
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) process.env[key] = value;
  }

  let result: Loaded;
  jest.isolateModules(() => {
    const {
      givethCatalogConfig,
    } = require("../features/import-projects/giveth/constants");
    result = givethCatalogConfig;
  });

  // Restoring with Object.assign would write the string "undefined" for a key
  // that was unset before the test.
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return result!;
};

const configured = {
  GIVETH_API_URL: "https://core.v6-staging.giveth.io/graphql",
  GIVETH_API_USERNAME: "devouch-user",
  GIVETH_API_PASSWORD: "devouch-pass",
};

describe("givethCatalogConfig", () => {
  it("returns the url and a Basic credential from username and password", () => {
    expect(loadConfig(configured)()).toEqual({
      url: configured.GIVETH_API_URL,
      headers: {
        Authorization:
          "Basic " +
          Buffer.from("devouch-user:devouch-pass").toString("base64"),
      },
    });
  });

  // Nothing set means the source is not enabled in this environment; the
  // importer reports that via skipImport rather than failing every cron run.
  it("returns null when none of the variables are set", () => {
    expect(loadConfig({})()).toBeNull();
  });

  // The V6 catalog is the only Giveth source (#189) and it is always
  // authenticated, so a partial configuration must fail the import with a
  // message naming what is missing - not send an anonymous request that comes
  // back UNAUTHENTICATED, and never fall back to the V5 public API.
  it("throws naming every missing variable when partially configured", () => {
    expect(() =>
      loadConfig({ ...configured, GIVETH_API_PASSWORD: undefined })()
    ).toThrow(/missing GIVETH_API_PASSWORD$/);
    expect(() =>
      loadConfig({ ...configured, GIVETH_API_USERNAME: undefined })()
    ).toThrow(/missing GIVETH_API_USERNAME$/);
    expect(() =>
      loadConfig({ ...configured, GIVETH_API_URL: undefined })()
    ).toThrow(/missing GIVETH_API_URL$/);
    expect(() => loadConfig({ GIVETH_API_USERNAME: "user-only" })()).toThrow(
      /missing GIVETH_API_URL, GIVETH_API_PASSWORD$/
    );
  });

  // Guards against leaking the credentials to the public Giveth API: an .env
  // that still carries the old default URL must fail before any request.
  it("refuses the V5 public API host", () => {
    expect(() =>
      loadConfig({
        ...configured,
        GIVETH_API_URL: "https://mainnet.serve.giveth.io/graphql",
      })()
    ).toThrow(/V5 public API/);
    // With the DNS root label, which `URL.hostname` preserves.
    expect(() =>
      loadConfig({
        ...configured,
        GIVETH_API_URL: "https://mainnet.serve.giveth.io./graphql",
      })()
    ).toThrow(/V5 public API/);
  });
});
