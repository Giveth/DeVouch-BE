module.exports = class AddNoAffiliation1735226891776 {
  name = "AddNoAffiliation1735226891776";

  async up(db) {
    // add organisation with name "No Affiliation"
    await db.query(
      `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
          VALUES (
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            'No Affiliation',
            '0x8f48094a12c8f99d616ae8f3305d5ec73cbaa6b6',
            '#0049b7',
          )`
    );
  }

  async down(db) {
    // remove organisation with name "No Affiliation"
    await db.query(
      `DELETE FROM "organisation" WHERE "id" = '0x0000000000000000000000000000000000000000000000000000000000000000'`
    );
  }
};
