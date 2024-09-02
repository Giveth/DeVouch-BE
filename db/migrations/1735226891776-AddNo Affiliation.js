module.exports = class AddNoAffiliation1735226891776 {
  name = "AddNoAffiliation1735226891776";

  async up(db) {
    // Add organisation with name "No Affiliation"
    await db.query(
      `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
        VALUES (
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          'No Affiliation',
          '0x0000000000000000000000000000000000000000',
          '#0049b7',
          null
        )`
    );
  }

  async down(db) {
    // Remove organisation with name "No Affiliation"
    await db.query(
      `DELETE FROM "organisation" WHERE "id" = '0x0000000000000000000000000000000000000000000000000000000000000000'`
    );
  }
};
