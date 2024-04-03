
module.exports = class AddTrace1712160942531 {
    name = "AddTrace1712160942531";
    
    async up(db) {
        // add organisation with name "Trace" and schema id "0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "schema_uid", "schema_user_field") VALUES ('trace', 'Trace', '0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722', 'account')`
        );
    }
    
    async down(db) {
        // remove organisation with name "Trace" and schema id "0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = 'trace'`
        );
    }
};
    