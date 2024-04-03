const fs = require("fs");
exports.default = function createOrganisationAddMigration(
  organisationName,
  schemaId,
  schemaUserField
) {
  const timestamp = new Date().getTime();
  const fileName = `${timestamp}-Add${organisationName}.js`;
  const organisationKey = `${organisationName.replace(/ /g, "")}`;
  const className = `Add${organisationKey}${timestamp}`;

  // create ./migrations/${fileName}
  fs.writeFileSync(
    __dirname + "/migrations/" + fileName,
    `
module.exports = class ${className} {
    name = "${className}";
    
    async up(db) {
        // add organisation with name "${organisationName}" and schema id "${schemaId}"
        await db.query(
        \`INSERT INTO "organisation" ("id", "name", "schema_uid", "schema_user_field") VALUES ('${organisationKey.toLocaleLowerCase()}', '${organisationName}', '${schemaId.toLocaleLowerCase()}', '${schemaUserField}')\`
        );
    }
    
    async down(db) {
        // remove organisation with name "${organisationName}" and schema id "${schemaId}"
        await db.query(
        \`DELETE FROM "organisation" WHERE "id" = '${organisationKey.toLocaleLowerCase()}'\`
        );
    }
};
    `
  );
};
