import { createOrmConfig } from "@subsquid/typeorm-config";
import { DataSource } from "typeorm";

let dataSource: DataSource | undefined = undefined;

export const getDataSource = async () => {
  try {
    if (!dataSource || !dataSource.isInitialized) {
      let cfg = createOrmConfig({ projectDir: __dirname + "/../.." });
      (cfg.entities as string[]).push(__dirname + "/../model/generated/*.ts");

      dataSource = await new DataSource(cfg).initialize();
    }
    return dataSource;
  } catch (error) {
    console.error("Failed to initialize DataSource", error);
    return null;
  }
};

export const createEntityManager = async () => {
  const dataSource = await getDataSource();
  if (!dataSource) return null;
  return dataSource.createEntityManager();
};
