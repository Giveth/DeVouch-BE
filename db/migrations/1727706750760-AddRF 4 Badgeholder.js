module.exports = class AddRF4Badgeholder1727706750760 {
    name = "AddRF4Badgeholder1727706750760";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // add organisation with name "RF 4 Badgeholder" and schema id "0xfdcfdad2dbe7489e0ce56b260348b7f14e8365a8a325aef9834818c00d46b31b"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '0xfdcfdad2dbe7489e0ce56b260348b7f14e8365a8a325aef9834818c00d46b31b',
            'RF 4 Badgeholder',
            '0xe4553b743e74da3424ac51f8c1e586fd43ae226f',
            '#ff0420'
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // remove organisation with name "RF 4 Badgeholder" and schema id "0xfdcfdad2dbe7489e0ce56b260348b7f14e8365a8a325aef9834818c00d46b31b"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0xfdcfdad2dbe7489e0ce56b260348b7f14e8365a8a325aef9834818c00d46b31b'`
        );
    }
};
    