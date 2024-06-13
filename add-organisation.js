const createOrganisationAddMigration =
  require("./db/create-organisation-add-migration").default;
const fs = require("fs");
const jsonc = require("jsonc-parser");

function main() {
  const orgConfig = fs.readFileSync("org-config.jsonc", {
    encoding: "utf-8",
  });
  const parsedData = jsonc.parse(orgConfig);
  const { name, schemaId, authorizedAttestor, network, color, startBlock } =
    parsedData;

  createOrganisationAddMigration(
    name,
    schemaId,
    authorizedAttestor,
    color,
    network,
    startBlock
  );
}

main();
