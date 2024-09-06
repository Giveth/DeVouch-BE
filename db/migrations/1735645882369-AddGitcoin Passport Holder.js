module.exports = class AddGitcoinPassportHolder1735645882369 {
    name = "AddGitcoinPassportHolder1735645882369";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // add organisation with name "Gitcoin Passport Holder" and schema id "0x6ab5d34260fca0cfcf0e76e96d439cace6aa7c3c019d7c4580ed52c6845e9c89"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
          VALUES (
            '0x6ab5d34260fca0cfcf0e76e96d439cace6aa7c3c019d7c4580ed52c6845e9c89',
            'Gitcoin Passport Holder',
            '0x843829986e895facd330486a61ebee9e1f1adb1a',
            '#00433b',
            108517456
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // remove organisation with name "Gitcoin Passport Holder" and schema id "0x6ab5d34260fca0cfcf0e76e96d439cace6aa7c3c019d7c4580ed52c6845e9c89"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0x6ab5d34260fca0cfcf0e76e96d439cace6aa7c3c019d7c4580ed52c6845e9c89'`
        );
    }
};
    