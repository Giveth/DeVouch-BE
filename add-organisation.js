const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;

const ORGANISATION_NAME = "Pizza Lovers"; // Replace with your own organisation name
const SCHEMA_ID =
  "0x9224f06bd11d0076dbcb28e4f0c654d78cb071930653510360a3a00518ad1710"; // Replace with your own schema id
const AUTHORIZED_ATTESTOR = "0x826976d7C600d45FB8287CA1d7c76FC8eb732030";
const COLOR = "#db284a";
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
