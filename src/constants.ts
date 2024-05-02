import { assertNotNull } from "@subsquid/evm-processor";

export const EAS_CONTRACT_ADDRESS = assertNotNull(
  process.env.EAS_CONTRACT_ADDRESS
);
export const SCHEMA_CONTRACT_ADDRESS = assertNotNull(
  process.env.SCHEMA_CONTRACT_ADDRESS
);

export const DB_HOST = assertNotNull(
  process.env.DB_HOST
);

export const PROJECT_VERIFY_SCHEMA = assertNotNull(
  process.env.PROJECT_VERIFY_ATTESTATION_SCHEMA
).toLocaleLowerCase();
