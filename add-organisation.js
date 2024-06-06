const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;

const ORGANISATION_NAME = "Degen"; // Replace with your own organisation name
const SCHEMA_ID =
  "0xa8122bdee6c8949308c097c2b28ab3d154bf4f27bf5a1e850a91884498b7de8c"; // Replace with your own schema id
const AUTHORIZED_ATTESTOR = "0x826976d7C600d45FB8287CA1d7c76FC8eb732030";
const COLOR = "#fff3c4";
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
