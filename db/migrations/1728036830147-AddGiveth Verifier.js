module.exports = class AddGivethVerifier1728036830147 {
    name = "AddGivethVerifier1728036830147";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // add organisation with name "Giveth Verifier" and schema id "0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404',
            'Giveth Verifier',
            '0x93e79499b00a2fdaac38e6005b0ad8e88b177346',
            '#8668fc'
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // remove organisation with name "Giveth Verifier" and schema id "0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404'`
        );
    }
};
    