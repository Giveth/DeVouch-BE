import { DataHandlerContext } from "@subsquid/evm-processor";
import { createOrmConfig } from "@subsquid/typeorm-config";
import { Store } from "@subsquid/typeorm-store";
import { assert } from "console";
import { DataSource, EntityManager } from "typeorm";

let connection: DataSource | undefined;
export async function getEntityManagerByConnection(): Promise<EntityManager> {
  if (!connection) {
    let cfg = createOrmConfig({ projectDir: __dirname + "/../../.." });
    (cfg.entities as string[]).push(__dirname + "/../../model/generated/*.ts");

    connection = await new DataSource(cfg).initialize();
  }
  return connection.createEntityManager();
}

export const getEntityMangerByContext = (
  ctx: DataHandlerContext<Store>
): EntityManager => {
  const em = (ctx.store as unknown as { em: () => EntityManager }).em();
  assert(em, "EntityManager not found in store");
  return em;
};
