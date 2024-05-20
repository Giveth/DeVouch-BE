import { createOrmConfig } from "@subsquid/typeorm-config";
import { DataSource } from "typeorm";

let ds: DataSource | undefined = undefined;

export const getDataSource = async () => {
  if (!ds || !ds.isInitialized) {
    let cfg = createOrmConfig({ projectDir: __dirname + "/../.." });
    (cfg.entities as string[]).push(__dirname + "/../model/generated/*.ts");

    ds = await new DataSource(cfg).initialize();
  }
  return ds;
};
