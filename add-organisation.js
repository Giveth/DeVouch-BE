const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;

const ORGANISATION_NAME = "Giveth Verifier"; // Replace with your own organisation name
const SCHEMA_ID =
  "0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404"; // Replace with your own schema id
const AUTHORIZED_ATTESTOR = "0x93E79499b00a2fdAAC38e6005B0ad8E88b177346";
const COLOR = "#8668fc";
// staging: eth-sepolia
// production: optimism-mainnet
const network = "optimism-mainnet";

function main() {
  createOrganisationAddMigration(
    ORGANISATION_NAME,
    SCHEMA_ID,
    AUTHORIZED_ATTESTOR,
    COLOR,
    network
  );
}

main();
