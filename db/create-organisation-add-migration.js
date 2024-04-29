const fs = require("fs");
exports.default = function createOrganisationAddMigration(
  organisationName,
  schemaId,
  schemaUserField,
  authorizedAttestor,
  color = null
) {
  const timestamp = new Date().getTime();
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
        \`INSERT INTO "organisation" ("id", "name", "schema_user_field", "issuer", "color") 
          VALUES (
            '${schemaId.toLocaleLowerCase()}',
            '${organisationName}',
            '${schemaUserField}',
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
