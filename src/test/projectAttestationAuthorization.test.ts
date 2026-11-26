import { afterAll, beforeEach, describe, expect, test } from "@jest/globals";
import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as ethers from "ethers";
import type { EntityManager } from "typeorm";
import * as EASContract from "../abi/EAS";
import * as SchemaContract from "../abi/Schema";
import {
  EAS_CONTRACT_ADDRESS,
  PROJECT_VERIFY_SCHEMA,
  ZERO_UID,
} from "../constants";
import { MAX_PROJECT_KEY_BYTES } from "../controllers/utils/projectVerificationHelper";
import { processAttest } from "../mappings/attest";
import { processRevokeLog } from "../mappings/revoke";
import {
  Attestor,
  AttestorOrganisation,
  Organisation,
  OrganisationProject,
  Project,
  ProjectAttestation,
} from "../model";
import {
  closeConnection,
  deleteAll,
  getTestCtx,
  getTestEntityManager,
} from "./utils";

// The real handlers run against the test database. Only the chain is faked:
// `eth_call` is answered from `chain`, ABI-encoded exactly as EAS and the
// schema registry would, so the handlers' own decoding is exercised.

const VERIFY_SCHEMA = [...PROJECT_VERIFY_SCHEMA][0];
const SCHEMA =
  "string projectSource,string projectId,bool vouch,string comment";
const ORG_ID = ethers.id("test organisation schema");
const ORG_ISSUER = ethers.getAddress(ethers.id("issuer").slice(0, 42));
// Checksummed (mixed-case) on purpose: events carry addresses in that form.
const MEMBER_A = ethers.getAddress(ethers.id("member a").slice(0, 42));
const MEMBER_B = ethers.getAddress(ethers.id("member b").slice(0, 42));
const OUTSIDER = ethers.getAddress(ethers.id("outsider").slice(0, 42));

interface ChainAttestation {
  attester: string;
  schema: string;
  refUID: string;
  data: string;
  recipient: string;
  // What the node answers as the attestation's own uid, when not the truth.
  returnedUid?: string;
}

let chain = new Map<string, ChainAttestation>();
let rpcFailure: Error | undefined;
let sequence = 0;
let warnings: string[] = [];

// What EAS answers for a uid it does not know: every field zero, no revert.
const NO_ATTESTATION: ChainAttestation = {
  attester: ethers.ZeroAddress,
  schema: ZERO_UID,
  refUID: ZERO_UID,
  data: "0x",
  recipient: ethers.ZeroAddress,
  returnedUid: ZERO_UID,
};

// Hex text of exactly `length` bytes with no repetition, so its stored size
// does not depend on PostgreSQL compressing it. The same text on every run.
const incompressible = (length: number) => {
  let text = "";
  for (let i = 0; text.length < length; i++) {
    text += ethers.id(`filler ${i}`).slice(2);
  }
  return text.slice(0, length);
};

const client = {
  call: async (_method: string, params: any[]) => {
    if (rpcFailure) throw rpcFailure;
    const { to, data } = params[0];
    if (to.toLowerCase() === EAS_CONTRACT_ADDRESS.toLowerCase()) {
      const [uid] = EASContract.abi.decodeFunctionData("getAttestation", data);
      const a = chain.get(uid) ?? NO_ATTESTATION;
      return EASContract.abi.encodeFunctionResult("getAttestation", [
        [
          a.returnedUid ?? uid,
          a.schema,
          1n,
          0n,
          0n,
          a.refUID,
          a.recipient,
          a.attester,
          true,
          a.data,
        ],
      ]);
    }
    const [uid] = SchemaContract.abi.decodeFunctionData("getSchema", data);
    return SchemaContract.abi.encodeFunctionResult("getSchema", [
      [uid, ethers.ZeroAddress, true, SCHEMA],
    ]);
  },
};

const makeLog = (
  event: "Attested" | "Revoked",
  uid: string,
  a: ChainAttestation
): Log => {
  const { topics, data } = EASContract.abi.encodeEventLog(event, [
    a.recipient,
    a.attester,
    uid,
    a.schema,
  ]);
  sequence += 1;
  return {
    topics,
    data,
    block: { height: sequence, timestamp: 1_700_000_000_000 + sequence * 1000 },
    getTransaction: () => ({ hash: ethers.id(`tx ${event} ${uid}`) }),
  } as unknown as Log;
};

const attestOnChain = (a: ChainAttestation) => {
  sequence += 1;
  const uid = ethers.id(`attestation ${sequence}`);
  chain.set(uid, a);
  return { uid, log: makeLog("Attested", uid, a) };
};

const encode = (
  projectSource: string,
  projectId: string,
  vouch: boolean,
  comment = ""
) =>
  new SchemaEncoder(SCHEMA).encodeData([
    { name: "projectSource", value: projectSource, type: "string" },
    { name: "projectId", value: projectId, type: "string" },
    { name: "vouch", value: vouch, type: "bool" },
    { name: "comment", value: comment, type: "string" },
  ]);

describe("project attestation authorization", () => {
  let em: EntityManager;
  let ctx: DataHandlerContext<Store>;

  const authorize = async (member: string) => {
    const { uid, log } = attestOnChain({
      attester: ORG_ISSUER,
      schema: ORG_ID,
      refUID: ZERO_UID,
      data: "0x",
      recipient: member,
    });
    await processAttest(ctx, log);
    return uid;
  };

  const attest = async (
    attester: string,
    refUID: string,
    data: string
  ): Promise<string> => {
    const { uid, log } = attestOnChain({
      attester,
      schema: VERIFY_SCHEMA,
      refUID,
      data,
      recipient: ethers.ZeroAddress,
    });
    await processAttest(ctx, log);
    return uid;
  };

  const revoke = async (uid: string) => {
    await processRevokeLog(ctx, makeLog("Revoked", uid, chain.get(uid)!));
  };

  // Everything an attestation can change, in one comparable value.
  const snapshot = async () => ({
    attestations: await em.query(
      `select pa.id, pa.vouch, pa.comment, pa.project_id, ao.attestor_id, ao.organisation_id
         from project_attestation pa
         join attestor_organisation ao on ao.id = pa.attestor_organisation_id
        order by pa.id`
    ),
    counters: await em.query(
      `select id, vouch, count from organisation_project order by id`
    ),
    projects: await em.query(
      `select id, total_vouches, total_flags, total_attests from project order by id`
    ),
    memberships: await em.query(
      `select id, attestor_id, organisation_id from attestor_organisation order by id`
    ),
    attestors: await em.query(`select id from attestor order by id`),
  });

  beforeEach(async () => {
    em = await getTestEntityManager();
    for (const entity of [
      ProjectAttestation,
      OrganisationProject,
      AttestorOrganisation,
      Attestor,
      Project,
      Organisation,
    ]) {
      await deleteAll(em, entity);
    }
    chain = new Map();
    rpcFailure = undefined;
    warnings = [];
    const record = (message: string) => warnings.push(message);
    const base = await getTestCtx();
    ctx = {
      ...base,
      _chain: { client },
      log: { debug: () => {}, info: () => {}, warn: record, error: record },
    } as unknown as DataHandlerContext<Store>;
    await ctx.store.upsert([
      new Organisation({
        id: ORG_ID,
        name: "Test Organisation",
        issuer: ORG_ISSUER.toLowerCase(),
      }),
      new Organisation({
        id: ZERO_UID,
        name: "No Affiliation",
        issuer: ethers.ZeroAddress,
      }),
    ]);
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe("legitimate flows", () => {
    test("a member vouches with their own authorization", async () => {
      const auth = await authorize(MEMBER_A);
      const uid = await attest(MEMBER_A, auth, encode("giveth", "1", true));

      const state = await snapshot();
      expect(state.attestations).toEqual([
        {
          id: uid,
          vouch: true,
          comment: "",
          project_id: "giveth-1",
          attestor_id: MEMBER_A.toLowerCase(),
          organisation_id: ORG_ID,
        },
      ]);
      expect(state.counters).toEqual([
        { id: `giveth-1-${ORG_ID}-vouch`, vouch: true, count: 1 },
      ]);
      expect(state.projects).toEqual([
        { id: "giveth-1", total_vouches: 1, total_flags: 0, total_attests: 1 },
      ]);
    });

    test("a member flags with their own authorization", async () => {
      const auth = await authorize(MEMBER_A);
      await attest(MEMBER_A, auth, encode("giveth", "1", false, "scam"));

      const state = await snapshot();
      expect(state.attestations).toMatchObject([
        {
          vouch: false,
          comment: "scam",
          attestor_id: MEMBER_A.toLowerCase(),
          organisation_id: ORG_ID,
        },
      ]);
      expect(state.counters).toEqual([
        { id: `giveth-1-${ORG_ID}-flag`, vouch: false, count: 1 },
      ]);
      expect(state.projects).toEqual([
        { id: "giveth-1", total_vouches: 0, total_flags: 1, total_attests: 1 },
      ]);
    });

    test("an attestation without a reference counts as No Affiliation", async () => {
      await attest(OUTSIDER, ZERO_UID, encode("giveth", "1", true));

      const state = await snapshot();
      expect(state.attestations).toMatchObject([
        {
          vouch: true,
          attestor_id: OUTSIDER.toLowerCase(),
          organisation_id: ZERO_UID,
        },
      ]);
      expect(state.memberships).toEqual([
        {
          id: `NO_AFFILIATION${OUTSIDER.toLowerCase()}`,
          attestor_id: OUTSIDER.toLowerCase(),
          organisation_id: ZERO_UID,
        },
      ]);
    });

    test("an unknown reference still counts as No Affiliation", async () => {
      await attest(
        OUTSIDER,
        ethers.id("not an authorization"),
        encode("giveth", "1", true)
      );

      expect((await snapshot()).attestations).toMatchObject([
        { attestor_id: OUTSIDER.toLowerCase(), organisation_id: ZERO_UID },
      ]);
    });

    test("a member's newer attestation replaces their older one", async () => {
      const auth = await authorize(MEMBER_A);
      await attest(MEMBER_A, auth, encode("giveth", "1", true));
      const second = await attest(MEMBER_A, auth, encode("giveth", "1", false));

      const state = await snapshot();
      expect(state.attestations).toMatchObject([{ id: second, vouch: false }]);
      expect(state.projects).toEqual([
        { id: "giveth-1", total_vouches: 0, total_flags: 1, total_attests: 1 },
      ]);
    });

    test("an upper-case reference UID resolves to the member's authorization", async () => {
      const auth = await authorize(MEMBER_A);
      const upper = "0x" + auth.slice(2).toUpperCase();
      await attest(MEMBER_A, upper, encode("giveth", "1", true));

      expect((await snapshot()).attestations).toMatchObject([
        { attestor_id: MEMBER_A.toLowerCase(), organisation_id: ORG_ID },
      ]);
    });

    test("the same member in two organisations attests for each with its own authorization", async () => {
      const otherOrg = ethers.id("another organisation schema");
      await ctx.store.upsert(
        new Organisation({
          id: otherOrg,
          name: "Another Organisation",
          issuer: ORG_ISSUER.toLowerCase(),
        })
      );
      const auth = await authorize(MEMBER_A);
      const other = attestOnChain({
        attester: ORG_ISSUER,
        schema: otherOrg,
        refUID: ZERO_UID,
        data: "0x",
        recipient: MEMBER_A,
      });
      await processAttest(ctx, other.log);

      await attest(MEMBER_A, auth, encode("giveth", "1", true));
      await attest(MEMBER_A, other.uid, encode("giveth", "1", true));

      const state = await snapshot();
      expect(
        state.attestations.map((a: any) => a.organisation_id).sort()
      ).toEqual([ORG_ID, otherOrg].sort());
      expect(state.projects).toMatchObject([{ total_vouches: 2 }]);
    });
  });

  describe("an authorization issued to another account", () => {
    test("a vouch is not recorded", async () => {
      const auth = await authorize(MEMBER_A);
      const before = await snapshot();

      await attest(OUTSIDER, auth, encode("giveth", "1", true));

      expect(await snapshot()).toEqual(before);
    });

    test("a flag is not recorded", async () => {
      const auth = await authorize(MEMBER_A);
      const before = await snapshot();

      await attest(OUTSIDER, auth, encode("giveth", "1", false));

      expect(await snapshot()).toEqual(before);
    });

    test("is not recorded as No Affiliation", async () => {
      const auth = await authorize(MEMBER_A);
      await attest(OUTSIDER, auth, encode("giveth", "1", true));

      const state = await snapshot();
      expect(state.attestations).toEqual([]);
      expect(state.projects).toEqual([]);
      expect(state.attestors).toEqual([{ id: MEMBER_A.toLowerCase() }]);
    });

    test("is not accepted from another member of the same organisation", async () => {
      const authA = await authorize(MEMBER_A);
      await authorize(MEMBER_B);
      const before = await snapshot();

      await attest(MEMBER_B, authA, encode("giveth", "1", true));

      expect(await snapshot()).toEqual(before);
    });

    test("repeated attempts leave the organisation counters empty", async () => {
      const auths = [
        await authorize(MEMBER_A),
        await authorize(MEMBER_B),
        await authorize(ORG_ISSUER),
      ];
      for (const auth of auths) {
        await attest(OUTSIDER, auth, encode("giveth", "999", true));
      }

      const state = await snapshot();
      expect(state.counters).toEqual([]);
      expect(state.projects).toEqual([]);
    });

    test("leaves the owner's existing attestation and counters unchanged", async () => {
      const auth = await authorize(MEMBER_A);
      const legitimate = await attest(
        MEMBER_A,
        auth,
        encode("giveth", "1", true, "mine")
      );
      const before = await snapshot();

      await attest(OUTSIDER, auth, encode("giveth", "1", false, "forged"));

      const after = await snapshot();
      expect(after).toEqual(before);
      expect(after.attestations).toMatchObject([
        { id: legitimate, vouch: true, comment: "mine" },
      ]);
    });

    test("followed by its revocation leaves the owner's data unchanged", async () => {
      const auth = await authorize(MEMBER_A);
      await attest(MEMBER_A, auth, encode("giveth", "1", true));
      const before = await snapshot();

      const forged = await attest(OUTSIDER, auth, encode("giveth", "1", false));
      await revoke(forged);

      expect(await snapshot()).toEqual(before);
    });

    test("does not stop the next valid attestation", async () => {
      const auth = await authorize(MEMBER_A);
      await attest(OUTSIDER, auth, encode("giveth", "1", true));
      const uid = await attest(MEMBER_A, auth, encode("giveth", "1", true));

      expect((await snapshot()).attestations).toMatchObject([
        {
          id: uid,
          attestor_id: MEMBER_A.toLowerCase(),
          organisation_id: ORG_ID,
        },
      ]);
    });
  });

  describe("malformed attestations", () => {
    const invalidUtf8 = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes", "bytes", "bool", "bytes"],
      [ethers.toUtf8Bytes("giveth"), "0xff", true, "0x"]
    );

    test.each([
      ["empty data", "0x"],
      ["truncated data", "0xdeadbeef"],
      ["invalid UTF-8 in a string", invalidUtf8],
      [
        "a NUL character in the comment",
        encode("giveth", "1", true, "a\u0000b"),
      ],
      ["a NUL character in the project id", encode("giveth", "1\u0000", true)],
      ["a NUL character in the source", encode("giv\u0000eth", "1", true)],
      [
        "a project id too long to index",
        encode("giveth", incompressible(12_000), true),
      ],
    ])("%s is skipped without writing anything", async (_name, data) => {
      const before = await snapshot();

      await expect(attest(OUTSIDER, ZERO_UID, data)).resolves.toBeDefined();

      expect(await snapshot()).toEqual(before);
      expect(warnings).toHaveLength(1);
    });

    test("a valid attestation after a skipped one is processed", async () => {
      await attest(OUTSIDER, ZERO_UID, "0x");
      await attest(OUTSIDER, ZERO_UID, encode("giveth", "1\u0000", true));
      const uid = await attest(OUTSIDER, ZERO_UID, encode("giveth", "1", true));

      expect((await snapshot()).attestations).toMatchObject([
        { id: uid, project_id: "giveth-1" },
      ]);
    });

    test("a project key of exactly the limit is stored", async () => {
      const projectId = incompressible(
        MAX_PROJECT_KEY_BYTES - "giveth-".length
      );
      const key = `giveth-${projectId}`;
      expect(Buffer.byteLength(key, "utf8")).toBe(MAX_PROJECT_KEY_BYTES);

      const uid = await attest(
        OUTSIDER,
        ZERO_UID,
        encode("giveth", projectId, true)
      );

      const state = await snapshot();
      expect(state.attestations).toEqual([
        {
          id: uid,
          vouch: true,
          comment: "",
          project_id: key,
          attestor_id: OUTSIDER.toLowerCase(),
          organisation_id: ZERO_UID,
        },
      ]);
      expect(state.counters).toEqual([
        { id: `${key}-${ZERO_UID}-vouch`, vouch: true, count: 1 },
      ]);
      expect(state.projects).toEqual([
        { id: key, total_vouches: 1, total_flags: 0, total_attests: 1 },
      ]);
      expect(warnings).toEqual([]);
    });

    test("a project key one byte over the limit is skipped", async () => {
      const projectId = incompressible(
        MAX_PROJECT_KEY_BYTES - "giveth-".length + 1
      );
      expect(Buffer.byteLength(`giveth-${projectId}`, "utf8")).toBe(
        MAX_PROJECT_KEY_BYTES + 1
      );
      const before = await snapshot();

      await attest(OUTSIDER, ZERO_UID, encode("giveth", projectId, true));

      expect(await snapshot()).toEqual(before);
      expect(warnings).toHaveLength(1);
    });

    // The handler stores source "rf4" as "rf" and turns "rf4-" in the project
    // id into "rf-", so the stored key is two bytes shorter than the attested
    // one. The limit applies to the stored key.
    describe("an rf4 project key", () => {
      // An rf4 attestation whose stored key is exactly `storedBytes` long.
      const rf4 = (storedBytes: number) => {
        const tail = incompressible(storedBytes - "rf-rf-".length);
        const projectId = `rf4-${tail}`;
        const storedKey = `rf-rf-${tail}`;
        expect(Buffer.byteLength(storedKey, "utf8")).toBe(storedBytes);
        expect(Buffer.byteLength(`rf4-${projectId}`, "utf8")).toBe(
          storedBytes + 2
        );
        return { projectId, storedKey };
      };

      test.each([
        ["over the limit as attested but under it as stored", -1],
        ["of exactly the limit as stored", 0],
      ])("%s is stored", async (_name, offset) => {
        const { projectId, storedKey } = rf4(MAX_PROJECT_KEY_BYTES + offset);

        const uid = await attest(
          OUTSIDER,
          ZERO_UID,
          encode("rf4", projectId, true)
        );

        const state = await snapshot();
        expect(state.attestations).toEqual([
          {
            id: uid,
            vouch: true,
            comment: "",
            project_id: storedKey,
            attestor_id: OUTSIDER.toLowerCase(),
            organisation_id: ZERO_UID,
          },
        ]);
        expect(state.counters).toEqual([
          { id: `${storedKey}-${ZERO_UID}-vouch`, vouch: true, count: 1 },
        ]);
        expect(state.projects).toEqual([
          { id: storedKey, total_vouches: 1, total_flags: 0, total_attests: 1 },
        ]);
        expect(warnings).toEqual([]);
      });

      test("one byte over the limit as stored is skipped", async () => {
        const { projectId } = rf4(MAX_PROJECT_KEY_BYTES + 1);
        const before = await snapshot();

        await attest(OUTSIDER, ZERO_UID, encode("rf4", projectId, true));

        expect(await snapshot()).toEqual(before);
        expect(warnings).toHaveLength(1);
      });
    });

    test("a long comment is kept", async () => {
      const comment = "c".repeat(20_000);
      await attest(OUTSIDER, ZERO_UID, encode("giveth", "1", true, comment));

      expect((await snapshot()).attestations).toMatchObject([{ comment }]);
    });

    test("an RPC failure is not swallowed", async () => {
      rpcFailure = new Error("rpc unavailable");
      const { log } = attestOnChain({
        attester: OUTSIDER,
        schema: VERIFY_SCHEMA,
        refUID: ZERO_UID,
        data: encode("giveth", "1", true),
        recipient: ethers.ZeroAddress,
      });

      await expect(processAttest(ctx, log)).rejects.toThrow("rpc unavailable");
    });

    describe("a node answer that is not the announced attestation", () => {
      const announce = () =>
        attestOnChain({
          attester: OUTSIDER,
          schema: VERIFY_SCHEMA,
          refUID: ZERO_UID,
          data: encode("giveth", "1", true),
          recipient: ethers.ZeroAddress,
        });

      test.each([
        [
          "an attestation the node does not have",
          (uid: string) => chain.delete(uid),
        ],
        [
          "an attestation with another uid",
          (uid: string) => (chain.get(uid)!.returnedUid = ethers.id("other")),
        ],
        [
          "an attestation with another schema",
          (uid: string) => (chain.get(uid)!.schema = ORG_ID),
        ],
        [
          "an attestation with another schema and undecodable data",
          (uid: string) => {
            chain.get(uid)!.schema = ORG_ID;
            chain.get(uid)!.data = "0x";
          },
        ],
      ])(
        "%s fails the batch instead of being skipped",
        async (_name, tamper) => {
          const { uid, log } = announce();
          tamper(uid);
          const before = await snapshot();

          await expect(processAttest(ctx, log)).rejects.toThrow(
            `for attestation ${uid}`
          );

          expect(await snapshot()).toEqual(before);
          expect(warnings).toEqual([]);
        }
      );

      test("the attestation is processed once the node answers correctly", async () => {
        const { uid, log } = announce();
        const attestation = chain.get(uid)!;
        chain.delete(uid);
        await expect(processAttest(ctx, log)).rejects.toThrow();

        chain.set(uid, attestation);
        await processAttest(ctx, log);

        expect((await snapshot()).attestations).toMatchObject([
          { id: uid, project_id: "giveth-1" },
        ]);
      });
    });
  });

  describe("database failures", () => {
    // The real store, except that upserting `entity` (any entity if omitted)
    // fails.
    const withFailingUpsert = (entity?: Function) =>
      ({
        ...ctx,
        store: new Proxy(ctx.store, {
          get: (target, property) => {
            const value = Reflect.get(target, property);
            if (typeof value !== "function") return value;
            if (property !== "upsert") return value.bind(target);
            return async (saved: unknown) => {
              const first = Array.isArray(saved) ? saved[0] : saved;
              if (!entity || first instanceof entity) {
                throw new Error("database unavailable");
              }
              return value.call(target, saved);
            };
          },
        }),
      }) as unknown as DataHandlerContext<Store>;

    const projectAttestationLog = () =>
      attestOnChain({
        attester: OUTSIDER,
        schema: VERIFY_SCHEMA,
        refUID: ZERO_UID,
        data: encode("giveth", "1", true),
        recipient: ethers.ZeroAddress,
      }).log;

    test("a failed write is not swallowed", async () => {
      await expect(
        processAttest(withFailingUpsert(), projectAttestationLog())
      ).rejects.toThrow("database unavailable");
    });

    test("a failed organisation counter write is not swallowed", async () => {
      await expect(
        processAttest(
          withFailingUpsert(OrganisationProject),
          projectAttestationLog()
        )
      ).rejects.toThrow("database unavailable");
    });

    test("a failed organisation counter write on revocation is not swallowed", async () => {
      const auth = await authorize(MEMBER_A);
      await attest(MEMBER_A, auth, encode("giveth", "1", true));
      const flag = await attest(
        OUTSIDER,
        ZERO_UID,
        encode("giveth", "1", false)
      );

      await expect(
        processRevokeLog(
          withFailingUpsert(OrganisationProject),
          makeLog("Revoked", flag, chain.get(flag)!)
        )
      ).rejects.toThrow("database unavailable");
    });

    test("a failed authorization write is not swallowed", async () => {
      const { log } = attestOnChain({
        attester: ORG_ISSUER,
        schema: ORG_ID,
        refUID: ZERO_UID,
        data: "0x",
        recipient: MEMBER_A,
      });

      await expect(
        processAttest(withFailingUpsert(AttestorOrganisation), log)
      ).rejects.toThrow("database unavailable");
    });
  });
});
