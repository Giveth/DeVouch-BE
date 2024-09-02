module.exports = class AddNoAffiliation1735226891776 {
  name = "AddNoAffiliation1735226891776";

  async up(db) {
    const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
    if (SQUID_NETWORK !== "eth-sepolia") return;
    // add organisation with name "No Affiliation" and schema id "0xb5b2e19821d6124101d31c7d5422a79402a0923a1ffaacbe3d8380688a18b7d1"
    await db.query(
      `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
          VALUES (
            '0xb5b2e19821d6124101d31c7d5422a79402a0923a1ffaacbe3d8380688a18b7d1',
            'No Affiliation',
            '0x8f48094a12c8f99d616ae8f3305d5ec73cbaa6b6',
            '#0049b7',
            6614922
          )`
    );
  }

  async down(db) {
    const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
    if (SQUID_NETWORK !== "eth-sepolia") return;
    // remove organisation with name "No Affiliation" and schema id "0xb5b2e19821d6124101d31c7d5422a79402a0923a1ffaacbe3d8380688a18b7d1"
    await db.query(
      `DELETE FROM "organisation" WHERE "id" = '0xb5b2e19821d6124101d31c7d5422a79402a0923a1ffaacbe3d8380688a18b7d1'`
    );
  }
};
