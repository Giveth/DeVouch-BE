const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;

const ORGANISATION_NAME = "Honorary Mexican"; // Replace with your own organisation name
const SCHEMA_ID =
  "0xc80d5c0209976a6c994aa6dc3680f4ad2de2dbc1aa9f46164c251ad9e5e10e09"; // Replace with your own schema id
const AUTHORIZED_ATTESTOR = "0x826976d7C600d45FB8287CA1d7c76FC8eb732030";
const COLOR = "#ff0022";
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
