module.exports = class AddGivethVerificationTeam1727410589775 {
  name = "AddGivethVerificationTeam1727410589775";

  async up(db) {
    const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
    if (SQUID_NETWORK !== "eth-sepolia") return;
    // add organisation with name "Giveth Verification Team" and schema id "0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404"
    await db.query(
      `INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404',
            'Giveth Verification Team',
            '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
            '#7f64cb'
          )`
    );
  }

  async down(db) {
    const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
    if (SQUID_NETWORK !== "eth-sepolia") return;
    // remove organisation with name "Giveth Verification Team" and schema id "0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404"
    await db.query(
      `DELETE FROM "organisation" WHERE "id" = '0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404'`
    );
  }
};
