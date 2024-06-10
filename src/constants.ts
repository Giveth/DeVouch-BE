import { assertNotNull } from "@subsquid/evm-processor";

const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";

const IS_PRODUCTION = SQUID_NETWORK === "optimism-mainnet";

export const EAS_CONTRACT_ADDRESS = assertNotNull(
  IS_PRODUCTION
    ? "0x4200000000000000000000000000000000000021"
    : "0xC2679fBD37d54388Ce493F1DB75320D236e1815e"
);
export const SCHEMA_CONTRACT_ADDRESS = assertNotNull(
  IS_PRODUCTION
    ? "0x4200000000000000000000000000000000000020"
    : "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0"
);

export const PROJECT_VERIFY_SCHEMA = assertNotNull(
  process.env.PROJECT_VERIFY_ATTESTATION_SCHEMA
).toLocaleLowerCase();

export const LOOKUP_ARCHIVE = IS_PRODUCTION
  ? "https://v2.archive.subsquid.io/network/optimism-mainnet"
  : "https://v2.archive.subsquid.io/network/ethereum-sepolia";

export const START_BLOCK = Number.parseInt(
  process.env.START_BLOCK || (IS_PRODUCTION ? "119837389" : "5815457")
);

export const IMPORT_PROJECT_CRON_SCHEDULE =
  process.env.IMPORT_PROJECT_CRON_SCHEDULE || "0 0 * * *"; // UTC

export const DESCRIPTION_SUMMARY_LENGTH = Number(
  process.env.DESCRIPTION_SUMMARY_LENGTH || 300
);
