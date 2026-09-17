// The header builder is read at module load, so each case needs a fresh module
// registry with the env already set.
const loadHeaders = (env: Record<string, string | undefined>) => {
  const previous = {
    GIVETH_API_USERNAME: process.env.GIVETH_API_USERNAME,
    GIVETH_API_PASSWORD: process.env.GIVETH_API_PASSWORD,
  };
  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
  }

  let headers: Record<string, string>;
  jest.isolateModules(() => {
    headers =
      require("../features/import-projects/giveth/constants").givethAuthHeaders();
  });

  // Restoring with Object.assign would write the string "undefined" for a key
  // that was unset, leaving a truthy value behind for the next case.
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return headers!;
};

describe("givethAuthHeaders", () => {
  it("builds a Basic credential from username and password", () => {
    const headers = loadHeaders({
      GIVETH_API_USERNAME: "devouch-e2e-user",
      GIVETH_API_PASSWORD: "devouch-e2e-pass",
    });

    expect(headers).toEqual({
      Authorization:
        "Basic " +
        Buffer.from("devouch-e2e-user:devouch-e2e-pass").toString("base64"),
    });
  });

  // Guards against sending credentials to the public Giveth API, which needs
  // none: a half-configured pair must send nothing rather than a broken header.
  it("sends nothing when either half is missing", () => {
    expect(
      loadHeaders({
        GIVETH_API_USERNAME: "user-only",
        GIVETH_API_PASSWORD: undefined,
      })
    ).toEqual({});
    expect(
      loadHeaders({
        GIVETH_API_USERNAME: undefined,
        GIVETH_API_PASSWORD: "pass-only",
      })
    ).toEqual({});
    expect(
      loadHeaders({
        GIVETH_API_USERNAME: undefined,
        GIVETH_API_PASSWORD: undefined,
      })
    ).toEqual({});
  });
});
