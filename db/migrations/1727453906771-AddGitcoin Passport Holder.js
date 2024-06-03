module.exports = class AddGitcoinPassportHolder1727453906771 {
    name = "AddGitcoinPassportHolder1727453906771";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // add organisation with name "Gitcoin Passport Holder" and schema id "0x110c216190edf1c2cab264505c0b83437f0caa50298f371ad91a87394d9c55b2"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '0x110c216190edf1c2cab264505c0b83437f0caa50298f371ad91a87394d9c55b2',
            'Gitcoin Passport Holder',
            '0x843829986e895facd330486a61ebee9e1f1adb1a',
            '#00433b00'
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // remove organisation with name "Gitcoin Passport Holder" and schema id "0x110c216190edf1c2cab264505c0b83437f0caa50298f371ad91a87394d9c55b2"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0x110c216190edf1c2cab264505c0b83437f0caa50298f371ad91a87394d9c55b2'`
        );
    }
};
    