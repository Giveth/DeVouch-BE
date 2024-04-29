const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;

const ORGANISATION_NAME = "Trace"; // Replace with your own organisation name
const SCHEMA_ID =
  "0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722"; // Replace with your own schema id
const SCHEMA_USER_FIELD = "account";
const AUTHORIZED_ATTESTOR = "0xF23eA0b5F14afcbe532A1df273F7B233EBe41C78";
const COLOR = "#FF0000";

function main() {
  createOrganisationAddMigration(
    ORGANISATION_NAME,
    SCHEMA_ID,
    SCHEMA_USER_FIELD,
    AUTHORIZED_ATTESTOR,
    COLOR
  );
}

main();
