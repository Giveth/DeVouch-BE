module.exports = class AddRF6Voter1740124124489 {
    name = "AddRF6Voter1740124124489";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // add organisation with name "RF6 Voter" and schema id "0x41513aa7b99bfea09d389c74aacedaeb13c28fb748569e9e2400109cbe284ee5"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
          VALUES (
            '0x41513aa7b99bfea09d389c74aacedaeb13c28fb748569e9e2400109cbe284ee5',
            'RF6 Voter',
            '0xe4553b743e74da3424ac51f8c1e586fd43ae226f',
            '#5e1312',
            126670178
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // remove organisation with name "RF6 Voter" and schema id "0x41513aa7b99bfea09d389c74aacedaeb13c28fb748569e9e2400109cbe284ee5"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0x41513aa7b99bfea09d389c74aacedaeb13c28fb748569e9e2400109cbe284ee5'`
        );
    }
};
    