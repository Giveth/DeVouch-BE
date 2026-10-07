import { describe, expect, test, afterAll } from "@jest/globals";
import {
  closeConnection,
  deleteAll,
  getTestCtx,
  getTestEntityManager,
} from "./utils";
import { Organisation } from "../model";

describe("simple storage", () => {
  beforeAll(async () => {
    const em = await getTestEntityManager();
    await deleteAll(em, Organisation);
  });
  afterAll(async () => {
    await closeConnection();
  });

  test("should save sample authorized attest", async () => {
    const ctx = await getTestCtx();
    const organization = new Organisation({
      id: "schemaUid",
      name: "name",
      issuer: "issuer",
    });

    await ctx.store.upsert([organization]);

    const fetchOrganization = await ctx.store.findOneBy(Organisation, {
      name: "name",
    });

    expect(fetchOrganization).toBeDefined();
    expect(fetchOrganization?.name).toBe("name");
  });

  test("should not fail on upserting the same entity", async () => {
    const ctx = await getTestCtx();
    const organization = new Organisation({
      id: "schemaUid",
      name: "name",
      issuer: "issuer",
    });

    await ctx.store.upsert(organization);
    await ctx.store.upsert(organization);

    const fetchOrganization = await ctx.store.findOneBy(Organisation, {
      name: "name",
    });

    expect(fetchOrganization).toBeDefined();
    expect(fetchOrganization?.name).toBe("name");
  });
});
