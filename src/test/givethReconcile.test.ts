import {
  describe,
  expect,
  test,
  beforeAll,
  beforeEach,
  afterAll,
} from "@jest/globals";
import { EntityManager } from "typeorm";
import {
  Attestor,
  AttestorOrganisation,
  Organisation,
  OrganisationProject,
  Project,
  ProjectAttestation,
} from "../model";
import { closeConnection, deleteAll, getTestEntityManager } from "./utils";
import { deactivateProjectsMissingFromCatalog } from "../features/import-projects/giveth/reconcile";
import type {
  GivethCatalogPage,
  GivethProjectInfo,
} from "../features/import-projects/giveth/type";
import type { ImportResult } from "../features/import-projects/types";
import {
  CATALOG_TOTAL_ABSOLUTE_SLACK,
  DEFAULT_MAX_DEACTIVATIONS_PER_RUN,
  confirmCatalogWalkIsComplete,
  resolveDeactivationCeiling,
  resolveMaxDeactivationsPerRun,
} from "../features/import-projects/giveth/reconcile";

// The importer's only network call. Kept behind a stable module-scope mock so
// the reference survives the lazy `require` below (`mock` prefix is what lets
// the hoisted factory close over it).
const mockFetchGivethCatalogBatch = jest.fn<
  Promise<GivethCatalogPage>,
  any[]
>();
jest.mock("../features/import-projects/giveth/service", () => ({
  fetchGivethCatalogBatch: (...args: any[]) =>
    mockFetchGivethCatalogBatch(...args),
}));

let fetchAndProcessGivethProjects: () => Promise<ImportResult>;
let em: EntityManager;

// `giveth/constants` reads its configuration at module load, so the importer is
// required only after the env is in place - a top-level import would be
// evaluated first and permanently skip the source.
beforeAll(async () => {
  process.env.GIVETH_API_URL = "https://core.example.test/graphql";
  process.env.GIVETH_API_USERNAME = "devouch-user";
  process.env.GIVETH_API_PASSWORD = "devouch-pass";
  em = await getTestEntityManager();
  fetchAndProcessGivethProjects =
    require("../features/import-projects/giveth/index").fetchAndProcessGivethProjects;
});

afterAll(async () => {
  await closeConnection();
});

beforeEach(async () => {
  mockFetchGivethCatalogBatch.mockReset();
  servedCatalogTotal = null;
  delete process.env.GIVETH_MAX_DEACTIVATIONS_PER_RUN;
  // Order matters: the attestation tables carry foreign keys into project.
  await deleteAll(em, ProjectAttestation);
  await deleteAll(em, OrganisationProject);
  await deleteAll(em, Project);
  await deleteAll(em, AttestorOrganisation);
  await deleteAll(em, Attestor);
  await deleteAll(em, Organisation);
});

const seedProject = async (
  source: string,
  projectId: string,
  overrides: Partial<Project> = {}
): Promise<Project> =>
  em.getRepository(Project).save(
    new Project({
      id: `${source}-${projectId}`,
      source,
      projectId,
      title: `Project ${projectId}`,
      description: "seeded",
      url: `/project/${projectId}`,
      totalVouches: 0,
      totalFlags: 0,
      totalAttests: 0,
      imported: true,
      lastUpdatedTimestamp: new Date("2026-01-01T00:00:00.000Z"),
      ...overrides,
    })
  );

const catalogProject = (id: string): GivethProjectInfo => ({
  id,
  title: `Project ${id}`,
  description: "from catalog",
  slug: `project-${id}`,
  image: null,
  creationDate: "2026-01-01T00:00:00.000Z",
});

// The catalog-wide `total` upstream reports on the one request that asks for
// it. `null` (the default) stands for an upstream that served no usable total,
// which makes the completeness cross-check skip itself.
let servedCatalogTotal: number | null = null;
const serveCatalogTotal = (total: number | null) => {
  servedCatalogTotal = total;
};

// The importer walks pages until one comes back empty; `pages` is served in
// order and the trailing [] ends the walk.
const servePages = (...pages: (GivethProjectInfo[] | Error)[]) => {
  let call = 0;
  mockFetchGivethCatalogBatch.mockImplementation(async (...args: any[]) => {
    const page = pages[call++] ?? [];
    if (page instanceof Error) throw page;
    // Mirrors the fetcher: `total` comes back only on a request that selected
    // it, so a page the importer did not ask it on reports null.
    return {
      projects: page,
      total: args[3]?.withTotal ? servedCatalogTotal : null,
    };
  });
};

// A catalog of `count` projects with ascending ids, which is what the keyset
// cursor contract requires of every page.
const catalogOf = (count: number, startId = 1000): GivethProjectInfo[] =>
  Array.from({ length: count }, (_, i) => catalogProject(String(startId + i)));

const reload = async (id: string): Promise<Project | null> =>
  em.getRepository(Project).findOneBy({ id });

describe("giveth import keeps the listing in sync with the catalog", () => {
  test("a project the catalog still lists stays visible, and a new one is imported", async () => {
    await seedProject("giveth", "100", { title: "Old title" });
    servePages([catalogProject("100"), catalogProject("200")], []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(true);
    expect(result.deactivated).toBe(0);
    expect((await reload("giveth-100"))?.imported).toBe(true);
    expect((await reload("giveth-100"))?.title).toBe("Project 100");
    const created = await reload("giveth-200");
    expect(created?.imported).toBe(true);
    expect(created?.title).toBe("Project 200");
  });

  // AC1/AC4: absence from a complete catalog is the deactivation signal, and
  // the first run after this ships reconciles projects stored long before it.
  test("a stored project missing from the complete catalog is hidden, not deleted", async () => {
    await seedProject("giveth", "17432");
    await seedProject("giveth", "17463");
    servePages([catalogProject("200")], []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(true);
    expect(result.deactivated).toBe(2);
    const hidden = await reload("giveth-17432");
    expect(hidden).not.toBeNull();
    expect(hidden?.imported).toBe(false);
    expect(hidden?.title).toBe("Project 17432");
    expect((await reload("giveth-17463"))?.imported).toBe(false);
  });

  // AC3
  test("a hidden project the catalog lists again becomes visible again", async () => {
    await seedProject("giveth", "100", {
      imported: false,
      // Every other field already matches what the catalog serves, so only the
      // hidden flag can drive the update.
      title: "Project 100",
      description: "from catalog",
      url: "/project/project-100",
      image: null,
    });
    servePages([catalogProject("100")], []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(true);
    expect(result.deactivated).toBe(0);
    expect((await reload("giveth-100"))?.imported).toBe(true);
  });

  // AC2
  test("hiding a project leaves its attestations, counters and history intact", async () => {
    const project = await seedProject("giveth", "17433", {
      totalVouches: 2,
      totalFlags: 1,
      totalAttests: 3,
    });
    const organisation = await em.getRepository(Organisation).save(
      new Organisation({
        id: "org-1",
        name: "Test Org",
        issuer: "0xissuer",
      })
    );
    const attestor = await em
      .getRepository(Attestor)
      .save(new Attestor({ id: "0xattestor" }));
    const attestorOrganisation = await em
      .getRepository(AttestorOrganisation)
      .save(
        new AttestorOrganisation({
          id: "ao-1",
          attestor,
          organisation,
          attestTimestamp: new Date("2026-02-01T00:00:00.000Z"),
        })
      );
    await em.getRepository(ProjectAttestation).save(
      new ProjectAttestation({
        id: "attestation-1",
        recipient: "0xrecipient",
        vouch: true,
        txHash: "0xtx",
        attestorOrganisation,
        project,
        attestTimestamp: new Date("2026-02-01T00:00:00.000Z"),
        comment: "keep me",
      })
    );
    await em.getRepository(OrganisationProject).save(
      new OrganisationProject({
        id: "giveth-17433-org-1-vouch",
        organisation,
        project,
        vouch: true,
        count: 2,
      })
    );

    servePages([catalogProject("200")], []);
    const result = await fetchAndProcessGivethProjects();

    expect(result.deactivated).toBe(1);
    const hidden = await reload("giveth-17433");
    expect(hidden?.imported).toBe(false);
    expect(hidden?.totalVouches).toBe(2);
    expect(hidden?.totalFlags).toBe(1);
    expect(hidden?.totalAttests).toBe(3);

    const attestation = await em
      .getRepository(ProjectAttestation)
      .findOneBy({ id: "attestation-1" });
    expect(attestation?.comment).toBe("keep me");
    expect(await em.getRepository(ProjectAttestation).count()).toBe(1);
    expect(await em.getRepository(OrganisationProject).count()).toBe(1);
  });

  // AC5: the catalog is only trustworthy as a whole.
  test("a page that fails aborts the run without hiding anything", async () => {
    await seedProject("giveth", "17432");
    servePages(
      [catalogProject("100")],
      new Error("GraphQL request failed: 502 - bad gateway")
    );

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("502");
    expect(result.deactivated).toBeUndefined();
    expect((await reload("giveth-17432"))?.imported).toBe(true);
  });

  test("a first page that fails (outage, UNAUTHENTICATED) hides nothing", async () => {
    await seedProject("giveth", "17432");
    servePages(new Error("UNAUTHENTICATED"));

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(false);
    expect((await reload("giveth-17432"))?.imported).toBe(true);
  });

  // A page that is not ascending means `afterId` cannot cover every row, so the
  // walk is truncated rather than complete - it must not reconcile either.
  test("a pagination contract violation hides nothing", async () => {
    await seedProject("giveth", "17432");
    servePages([catalogProject("300"), catalogProject("200")], []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("ordered ascending");
    expect((await reload("giveth-17432"))?.imported).toBe(true);
  });

  // An empty-but-successful walk cannot be told apart from an upstream fault,
  // so it must never mass-hide.
  test("an entirely empty catalog does not deactivate anything", async () => {
    await seedProject("giveth", "17432");
    await seedProject("giveth", "17433");
    servePages([]);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Refusing to reconcile");
    expect((await reload("giveth-17432"))?.imported).toBe(true);
    expect((await reload("giveth-17433"))?.imported).toBe(true);
  });

  // Scope: the reconciliation is keyed on `source`.
  test("projects from other sources are untouched", async () => {
    await seedProject("gitcoin", "abc");
    await seedProject("rf", "42");
    await seedProject("giveth", "17432");
    servePages([catalogProject("100")], []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.deactivated).toBe(1);
    expect((await reload("gitcoin-abc"))?.imported).toBe(true);
    expect((await reload("rf-42"))?.imported).toBe(true);
    expect((await reload("giveth-17432"))?.imported).toBe(false);
  });
});

describe("deactivateProjectsMissingFromCatalog", () => {
  test("refuses an empty catalog set before touching the database", async () => {
    await seedProject("giveth", "17432");

    await expect(
      deactivateProjectsMissingFromCatalog("giveth", new Set())
    ).rejects.toThrow("Refusing to reconcile");
    expect((await reload("giveth-17432"))?.imported).toBe(true);
  });

  test("does not rewrite projects that are already hidden", async () => {
    const hiddenAt = new Date("2026-01-01T00:00:00.000Z");
    await seedProject("giveth", "17432", {
      imported: false,
      lastUpdatedTimestamp: hiddenAt,
    });

    const deactivated = await deactivateProjectsMissingFromCatalog(
      "giveth",
      new Set(["giveth-1"])
    );

    expect(deactivated).toEqual([]);
    expect((await reload("giveth-17432"))?.lastUpdatedTimestamp).toEqual(
      hiddenAt
    );
  });

  test("returns the ids it hid", async () => {
    await seedProject("giveth", "17432");
    await seedProject("giveth", "17433");

    const deactivated = await deactivateProjectsMissingFromCatalog(
      "giveth",
      new Set(["giveth-17433"])
    );

    expect(deactivated).toEqual(["giveth-17432"]);
  });
});

describe("the per-run deactivation ceiling", () => {
  test("walks the catalog at the maximum page size the v6 API supports", async () => {
    servePages([catalogProject("100")], []);

    await fetchAndProcessGivethProjects();

    // take = 100 (MAX_PAGE_SIZE upstream), and `total` is asked for on the
    // first request only - it costs a COUNT over the whole table.
    expect(mockFetchGivethCatalogBatch).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      100,
      0,
      { withTotal: true }
    );
    expect(mockFetchGivethCatalogBatch).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      100,
      100,
      { withTotal: false }
    );
  });

  test("hides up to the configured ceiling", async () => {
    process.env.GIVETH_MAX_DEACTIVATIONS_PER_RUN = "2";
    await seedProject("giveth", "17432");
    await seedProject("giveth", "17433");
    servePages([catalogProject("100")], []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(true);
    expect(result.deactivated).toBe(2);
    expect((await reload("giveth-17432"))?.imported).toBe(false);
    expect((await reload("giveth-17433"))?.imported).toBe(false);
  });

  // All-or-nothing: one project over the ceiling and the whole set stays put.
  test("a stale set over the configured ceiling changes zero projects", async () => {
    process.env.GIVETH_MAX_DEACTIVATIONS_PER_RUN = "1";
    const seededAt = new Date("2026-01-01T00:00:00.000Z");
    await seedProject("giveth", "17432", { lastUpdatedTimestamp: seededAt });
    await seedProject("giveth", "17433", { lastUpdatedTimestamp: seededAt });
    servePages([catalogProject("100")], []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("over the 1 per-run ceiling");
    expect(result.deactivated).toBeUndefined();
    for (const id of ["giveth-17432", "giveth-17433"]) {
      const untouched = await reload(id);
      expect(untouched?.imported).toBe(true);
      // Not even a timestamp bump: the refusal happens before the write.
      expect(untouched?.lastUpdatedTimestamp).toEqual(seededAt);
    }
  });

  test("an unparseable ceiling falls back to the default instead of failing the run", async () => {
    process.env.GIVETH_MAX_DEACTIVATIONS_PER_RUN = "not-a-number";
    await seedProject("giveth", "17432");
    servePages([catalogProject("100")], []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(true);
    expect(result.deactivated).toBe(1);
    expect((await reload("giveth-17432"))?.imported).toBe(false);
  });
});

describe("resolveMaxDeactivationsPerRun", () => {
  test("takes a positive integer", () => {
    expect(resolveMaxDeactivationsPerRun("1")).toBe(1);
    expect(resolveMaxDeactivationsPerRun("2500")).toBe(2500);
    expect(resolveMaxDeactivationsPerRun("  400  ")).toBe(400);
  });

  // A broken value is a typo, not an intent to disable the guard, so every one
  // of these has to land on the default rather than on 0, NaN or Infinity.
  test.each([
    ["unset", undefined],
    ["empty", ""],
    ["blank", "   "],
    ["not a number", "abc"],
    ["zero", "0"],
    ["negative", "-5"],
    ["fractional", "12.5"],
    ["exponential", "1e3"],
    ["hex", "0x20"],
    ["signed", "+250"],
    ["trailing junk", "250 projects"],
    ["beyond safe integers", "99999999999999999999"],
  ])("falls back to the default when %s", (_label, raw) => {
    expect(resolveMaxDeactivationsPerRun(raw)).toBe(
      DEFAULT_MAX_DEACTIVATIONS_PER_RUN
    );
  });
});

// `total` is a per-request COUNT taken off the read replica while pages come
// off the primary, so it can only ever catch a walk that ended far too early.
describe("confirmCatalogWalkIsComplete", () => {
  test("confirms a walk that matches the reported total", () => {
    expect(confirmCatalogWalkIsComplete("giveth", 1000, 1000)).toBe(true);
  });

  // Projects deactivated while pagination ran were served by an earlier page
  // and are gone from a count taken later - the exact signal reconciliation
  // exists to act on, so it must never be read as a fault.
  test("confirms walking more projects than the total reports", () => {
    expect(confirmCatalogWalkIsComplete("giveth", 1000, 940)).toBe(true);
  });

  test("confirms a walk through ordinary churn", () => {
    // 5% of the total, or 25, whichever is larger.
    expect(confirmCatalogWalkIsComplete("giveth", 1000 - 50, 1000)).toBe(true);
    expect(
      confirmCatalogWalkIsComplete(
        "giveth",
        100 - CATALOG_TOTAL_ABSOLUTE_SLACK,
        100
      )
    ).toBe(true);
  });

  test("rejects a walk that stopped far short of the total", () => {
    expect(() => confirmCatalogWalkIsComplete("giveth", 100, 1000)).toThrow(
      "a shortfall of 900 over the 50 tolerated"
    );
    expect(() =>
      confirmCatalogWalkIsComplete("giveth", 1000 - 51, 1000)
    ).toThrow("Refusing to reconcile");
  });

  // Losing an optional upstream field costs a cross-check, not a safety
  // property - the ceiling and the empty-catalog refusal still stand. It
  // reports the walk as unverified rather than failing it.
  test("reports an unavailable total as unconfirmed without throwing", () => {
    expect(confirmCatalogWalkIsComplete("giveth", 1, null)).toBe(false);
  });
});

describe("the catalog total cross-check inside a run", () => {
  test("a complete walk reconciles normally", async () => {
    await seedProject("giveth", "17432");
    serveCatalogTotal(30);
    servePages(catalogOf(30), []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(true);
    expect(result.deactivated).toBe(1);
    expect((await reload("giveth-17432"))?.imported).toBe(false);
  });

  // The failure the per-run ceiling cannot see: a walk that ends early but
  // still carries fewer stale rows than the ceiling allows.
  test("a walk that ended far short of the total hides nothing", async () => {
    await seedProject("giveth", "17432");
    serveCatalogTotal(1000);
    servePages(catalogOf(30), []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Refusing to reconcile");
    expect(result.error).toContain("ended early");
    expect(result.deactivated).toBeUndefined();
    expect((await reload("giveth-17432"))?.imported).toBe(true);
  });

  test("a couple of projects activated mid-walk do not trip the guard", async () => {
    await seedProject("giveth", "17432");
    // Two projects went ACTIVE after the count was taken but before the walk
    // reached their ids: a routine race, not a truncated fetch.
    serveCatalogTotal(32);
    servePages(catalogOf(30), []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(true);
    expect(result.deactivated).toBe(1);
    expect((await reload("giveth-17432"))?.imported).toBe(false);
  });

  test("an upstream that serves no total still reconciles", async () => {
    await seedProject("giveth", "17432");
    serveCatalogTotal(null);
    servePages(catalogOf(30), []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(true);
    expect(result.deactivated).toBe(1);
  });
});

// #190 AC4: the first run after this ships has to clear a backlog nobody has
// sized in advance. A fixed ceiling would refuse it - and keep refusing it
// every run - so the ceiling scales once the catalog's own count has ruled out
// the truncation it exists to catch.
describe("resolveDeactivationCeiling", () => {
  test("an unconfirmed walk is held to the configured ceiling", () => {
    expect(resolveDeactivationCeiling(10_000, false)).toBe(
      DEFAULT_MAX_DEACTIVATIONS_PER_RUN
    );
  });

  test("a confirmed walk may clear up to half the listings", () => {
    expect(resolveDeactivationCeiling(10_000, true)).toBe(5000);
    expect(resolveDeactivationCeiling(1001, true)).toBe(501);
  });

  // Strictly more permissive, never less: below the configured number the
  // fraction must not tighten the guard.
  test("the configured ceiling is a floor in both regimes", () => {
    expect(resolveDeactivationCeiling(10, true)).toBe(
      DEFAULT_MAX_DEACTIVATIONS_PER_RUN
    );
    process.env.GIVETH_MAX_DEACTIVATIONS_PER_RUN = "9000";
    expect(resolveDeactivationCeiling(10_000, true)).toBe(9000);
    expect(resolveDeactivationCeiling(10_000, false)).toBe(9000);
  });
});

describe("clearing the first-run backlog (AC4)", () => {
  // The pair that matters: the same backlog, refused when the walk cannot be
  // verified and cleared when it can.
  test("a confirmed walk clears a backlog over the configured ceiling", async () => {
    process.env.GIVETH_MAX_DEACTIVATIONS_PER_RUN = "2";
    for (const id of ["17432", "17433", "17434", "17435"]) {
      await seedProject("giveth", id);
    }
    serveCatalogTotal(6);
    servePages(catalogOf(6), []);

    const result = await fetchAndProcessGivethProjects();

    // 4 stale of 10 listed; the configured 2 is lifted to ceil(10 * 0.5).
    expect(result.ok).toBe(true);
    expect(result.deactivated).toBe(4);
    expect((await reload("giveth-17432"))?.imported).toBe(false);
    expect((await reload("giveth-17435"))?.imported).toBe(false);
  });

  test("the same backlog is refused when the walk cannot be confirmed", async () => {
    process.env.GIVETH_MAX_DEACTIVATIONS_PER_RUN = "2";
    for (const id of ["17432", "17433", "17434", "17435"]) {
      await seedProject("giveth", id);
    }
    serveCatalogTotal(null);
    servePages(catalogOf(6), []);

    const result = await fetchAndProcessGivethProjects();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("served no total");
    expect((await reload("giveth-17432"))?.imported).toBe(true);
    expect((await reload("giveth-17435"))?.imported).toBe(true);
  });

  // The guard the fraction preserves: a confirmed walk still must not blank
  // most of the listings in one run.
  test("a confirmed walk still refuses to hide most of the listings", async () => {
    process.env.GIVETH_MAX_DEACTIVATIONS_PER_RUN = "2";
    for (const id of ["1", "2", "3", "4", "5", "6", "7", "8"]) {
      await seedProject("giveth", id);
    }
    serveCatalogTotal(2);
    servePages(catalogOf(2), []);

    const result = await fetchAndProcessGivethProjects();

    // 8 stale of 10 listed, over ceil(10 * 0.5).
    expect(result.ok).toBe(false);
    expect(result.error).toContain("confirmed complete");
    expect(result.error).toContain("raised deliberately");
    expect((await reload("giveth-1"))?.imported).toBe(true);
    expect((await reload("giveth-8"))?.imported).toBe(true);
  });
});
