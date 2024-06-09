const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;

const ORGANISATION_NAME = "Gitcoin Passport Holder"; // Replace with your own organisation name
const SCHEMA_ID =
  "0x110c216190edf1c2cab264505c0b83437f0caa50298f371ad91a87394d9c55b2"; // Replace with your own schema id
const AUTHORIZED_ATTESTOR = "0x843829986e895facd330486a61Ebee9E1f1adB1a";
const COLOR = "#00433b";
// staging: eth-sepolia
// production: optimism-mainnet
const network = "eth-sepolia";

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
