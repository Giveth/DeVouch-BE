module.exports = class AddOptimismSuperDelegate1728227711495 {
    name = "AddOptimismSuperDelegate1728227711495";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // add organisation with name "Optimism Super Delegate" and schema id "0xe4a196f8ea37d5f9699b095594e44b465b2703eff0615cf9766060786eef517b"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
          VALUES (
            '0xe4a196f8ea37d5f9699b095594e44b465b2703eff0615cf9766060786eef517b',
            'Optimism Super Delegate',
            '0x93e79499b00a2fdaac38e6005b0ad8e88b177346',
            '#ff0420',
            null
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // remove organisation with name "Optimism Super Delegate" and schema id "0xe4a196f8ea37d5f9699b095594e44b465b2703eff0615cf9766060786eef517b"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0xe4a196f8ea37d5f9699b095594e44b465b2703eff0615cf9766060786eef517b'`
        );
    }
};
    