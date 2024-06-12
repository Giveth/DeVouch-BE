const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;

const ORGANISATION_NAME = "Optimism Super Delegate"; // Replace with your own organisation name
const SCHEMA_ID =
  "0xe4a196f8ea37d5f9699b095594e44b465b2703eff0615cf9766060786eef517b"; // Replace with your own schema id
const AUTHORIZED_ATTESTOR = "0x93E79499b00a2fdAAC38e6005B0ad8E88b177346";
const COLOR = "#ff0420";
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
