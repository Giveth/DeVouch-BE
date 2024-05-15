const fs = require("fs");

// To make all add organisation migration run after the initial migration
const ADD_ORG_MIGRATION_OFFSET = 10000000000; // More than 317 years!

exports.default = function createOrganisationAddMigration(
  organisationName,
  schemaId,
  authorizedAttestor,
  color = null
) {
  const timestamp = new Date().getTime() + ADD_ORG_MIGRATION_OFFSET;
  const fileName = `${timestamp}-Add${organisationName}.js`;
  const className = `Add${organisationName.replace(/ /g, "")}${timestamp}`;

  // create ./migrations/${fileName}
  fs.writeFileSync(
    __dirname + "/migrations/" + fileName,
    `
module.exports = class ${className} {
    name = "${className}";
    
    async up(db) {
        // add organisation with name "${organisationName}" and schema id "${schemaId}"
        await db.query(
        \`INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '${schemaId.toLocaleLowerCase()}',
            '${organisationName}',
            '${authorizedAttestor.toLocaleLowerCase()}',
            ${color ? "'" + color.toLocaleLowerCase() + "'" : null}
          )\`
        );
    }
    
    async down(db) {
        // remove organisation with name "${organisationName}" and schema id "${schemaId}"
        await db.query(
        \`DELETE FROM "organisation" WHERE "id" = '${schemaId.toLocaleLowerCase()}'\`
        );
    }
};
    `
  );
};
