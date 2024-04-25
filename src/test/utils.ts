import { Store, TypeormDatabase } from "@subsquid/typeorm-store";
import { createOrmConfig } from "@subsquid/typeorm-config";
import { DataSource, EntityManager } from "typeorm";
import { DataHandlerContext } from "@subsquid/evm-processor";

// import dotenv from "dotenv";

// dotenv.config({
//   path: ".env.test",
// });

let connection: DataSource | undefined;

export async function getEntityManager(): Promise<EntityManager> {
  if (!connection) {
    let cfg = createOrmConfig({ projectDir: __dirname + "/../.." });
    (cfg.entities as string[]).push(__dirname + "/../model/generated/*.ts");

    connection = await new DataSource(cfg).initialize();

    await connection.dropDatabase();
    await connection.synchronize();
    // await connection.runMigrations();
  }
  return connection.createEntityManager();
}

export async function closeConnection() {
  if (connection) {
    await connection.destroy();
  }
}

export async function getStore(): Promise<Store> {
  const em = await getEntityManager();
  return new Store(() => em);
}

export async function getCtx(): Promise<DataHandlerContext<Store>> {
  const store = await getStore();
  return {
    _chain: undefined,
    log: undefined,
    store,
    blocks: undefined,
    isHead: true,
  } as unknown as DataHandlerContext<Store>;
}
