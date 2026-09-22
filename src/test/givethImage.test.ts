import { resolveGivethImageUrl } from "../features/import-projects/giveth/helpers";

const STAGING = "https://v6-staging.giveth.io";
const PRODUCTION = "https://qf.giveth.io";

// The V6 catalog serves default project images as frontend-relative paths
// (#189). These pin the rule: relative paths get the frontend host of the
// deployment, everything that is already a URL is left untouched.
describe("resolveGivethImageUrl", () => {
  it("prefixes a frontend-relative path with the staging host", () => {
    expect(
      resolveGivethImageUrl("/images/defaultProjectImages/3.png", STAGING)
    ).toBe("https://v6-staging.giveth.io/images/defaultProjectImages/3.png");
  });

  it("prefixes a frontend-relative path with the production host", () => {
    expect(
      resolveGivethImageUrl("/images/defaultProjectImages/3.png", PRODUCTION)
    ).toBe("https://qf.giveth.io/images/defaultProjectImages/3.png");
  });

  it("does not double the slash when the base url has a trailing slash or the path has none", () => {
    expect(resolveGivethImageUrl("/images/a.png", `${STAGING}/`)).toBe(
      `${STAGING}/images/a.png`
    );
    expect(resolveGivethImageUrl("images/a.png", STAGING)).toBe(
      `${STAGING}/images/a.png`
    );
  });

  it("leaves absolute http(s) urls untouched", () => {
    const uploaded =
      "https://giveth.mypinata.cloud/ipfs/QmXyz/project-banner.png";
    expect(resolveGivethImageUrl(uploaded, STAGING)).toBe(uploaded);
    expect(resolveGivethImageUrl("http://example.test/a.png", STAGING)).toBe(
      "http://example.test/a.png"
    );
  });

  it("leaves other schemes (ipfs:, data:) untouched", () => {
    expect(resolveGivethImageUrl("ipfs://QmXyz/a.png", STAGING)).toBe(
      "ipfs://QmXyz/a.png"
    );
    expect(resolveGivethImageUrl("data:image/png;base64,AAAA", STAGING)).toBe(
      "data:image/png;base64,AAAA"
    );
  });

  it("adds only a scheme to a protocol-relative url", () => {
    expect(resolveGivethImageUrl("//cdn.example.test/a.png", STAGING)).toBe(
      "https://cdn.example.test/a.png"
    );
  });

  it("keeps missing images as null", () => {
    expect(resolveGivethImageUrl(null, STAGING)).toBeNull();
    expect(resolveGivethImageUrl(undefined, STAGING)).toBeNull();
    expect(resolveGivethImageUrl("", STAGING)).toBeNull();
    expect(resolveGivethImageUrl("   ", STAGING)).toBeNull();
  });

  it("uses the configured GIVETH_IMAGE_BASE_URL by default", () => {
    const previous = process.env.GIVETH_IMAGE_BASE_URL;
    process.env.GIVETH_IMAGE_BASE_URL = "https://frontend.example.test/";
    try {
      let resolve: typeof resolveGivethImageUrl;
      jest.isolateModules(() => {
        resolve =
          require("../features/import-projects/giveth/helpers").resolveGivethImageUrl;
      });
      expect(resolve!("/images/defaultProjectImages/3.png")).toBe(
        "https://frontend.example.test/images/defaultProjectImages/3.png"
      );
    } finally {
      if (previous === undefined) delete process.env.GIVETH_IMAGE_BASE_URL;
      else process.env.GIVETH_IMAGE_BASE_URL = previous;
    }
  });
});
