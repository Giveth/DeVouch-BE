const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;

const ORGANISATION_NAME = "Giveth Verification Team"; // Replace with your own organisation name
const SCHEMA_ID =
  "0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404"; // Replace with your own schema id
const AUTHORIZED_ATTESTOR = "0x826976d7C600d45FB8287CA1d7c76FC8eb732030";
const COLOR = "#7f64cb";

function main() {
  createOrganisationAddMigration(
    ORGANISATION_NAME,
    SCHEMA_ID,
    AUTHORIZED_ATTESTOR,
    COLOR
  );
}

main();
