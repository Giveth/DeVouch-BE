
module.exports = class AddTrace1713880694512 {
    name = "AddTrace1713880694512";
    
    async up(db) {
        // add organisation with name "Trace" and schema id "0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "schema_uid", "schema_user_field", "issuer", "color") 
          VALUES (
            'trace',
            'Trace',
            '0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722',
            'account',
            '0xf23ea0b5f14afcbe532a1df273f7b233ebe41c78',
            '#ff0000'
          )`
        );
    }
    
    async down(db) {
        // remove organisation with name "Trace" and schema id "0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = 'trace'`
        );
    }
};
    