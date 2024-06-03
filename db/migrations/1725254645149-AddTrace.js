module.exports = class AddTrace1725254645149 {
  name = "AddTrace1725254645149";

  async up(db) {
    const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
    if (SQUID_NETWORK !== "eth-sepolia") return;
    // add organisation with name "Trace" and schema id "0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722"
    await db.query(
      `INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722',
            'Trace',
            '0xf23ea0b5f14afcbe532a1df273f7b233ebe41c78',
            '#ff0000'
          )`
    );
  }

  async down(db) {
    const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
    if (SQUID_NETWORK !== "eth-sepolia") return;
    // remove organisation with name "Trace" and schema id "0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722"
    await db.query(
      `DELETE FROM "organisation" WHERE "id" = '0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722'`
    );
  }
};
