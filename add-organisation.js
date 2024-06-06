const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;

const ORGANISATION_NAME = "RF 4 Badgeholder"; // Replace with your own organisation name
const SCHEMA_ID =
  "0xfdcfdad2dbe7489e0ce56b260348b7f14e8365a8a325aef9834818c00d46b31b"; // Replace with your own schema id
const AUTHORIZED_ATTESTOR = "0xE4553b743E74dA3424Ac51f8C1E586fd43aE226F";
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
