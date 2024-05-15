import { Store, TypeormDatabase } from "@subsquid/typeorm-store";
import { createOrmConfig } from "@subsquid/typeorm-config";
import { DataSource, DataSourceOptions, EntityManager } from "typeorm";
import { DataHandlerContext } from "@subsquid/evm-processor";

// import dotenv from "dotenv";

// dotenv.config({
//   path: ".env.test",
// });

let connection: DataSource | undefined;

export async function getTestEntityManager(): Promise<EntityManager> {
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
    connection = undefined;
  }
}

export async function getTestStore(): Promise<Store> {
  const em = await getTestEntityManager();
  return new Store(() => em);
}

export async function getTestCtx(): Promise<DataHandlerContext<Store>> {
  const store = await getTestStore();
  return {
    _chain: undefined,
    log: undefined,
    store,
    blocks: undefined,
    isHead: true,
  } as unknown as DataHandlerContext<Store>;
}
