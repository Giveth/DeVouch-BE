import { describe, expect, test, afterAll } from "@jest/globals";
import { closeConnection, getTestCtx } from "./utils";
import { Organisation } from "../model";

describe("simple storage", () => {
  afterAll(async () => {
    await closeConnection();
  });

  test("sample authorized attest", async () => {
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
});
