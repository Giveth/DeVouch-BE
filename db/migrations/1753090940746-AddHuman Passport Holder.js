module.exports = class AddHumanPassportHolder1753090940746 {
    name = "AddHumanPassportHolder1753090940746";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // add organisation with name "Human Passport Holder" and schema id "0xda0257756063c891659fed52fd36ef7557f7b45d66f59645fd3c3b263b747254"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
          VALUES (
            '0xda0257756063c891659fed52fd36ef7557f7b45d66f59645fd3c3b263b747254',
            'Human Passport Holder',
            '0x843829986e895facd330486a61ebee9e1f1adb1a',
            '#5000a2',
            133125800
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // remove organisation with name "Human Passport Holder" and schema id "0xda0257756063c891659fed52fd36ef7557f7b45d66f59645fd3c3b263b747254"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0xda0257756063c891659fed52fd36ef7557f7b45d66f59645fd3c3b263b747254'`
        );
    }
};
    