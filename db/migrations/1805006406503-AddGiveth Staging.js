module.exports = class AddGivethStaging1805006406503 {
    name = "AddGivethStaging1805006406503";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // add organisation with name "Giveth Staging" and schema id "0x95911ce48fde715f26127d0b816ce319be6808b37a94e4187c55bdc49b43dd58"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
          VALUES (
            '0x95911ce48fde715f26127d0b816ce319be6808b37a94e4187c55bdc49b43dd58',
            'Giveth Staging',
            '0x29ee09bd0f7f41ecd083ad2708df17691065790b',
            '#e1458d',
            null
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // remove organisation with name "Giveth Staging" and schema id "0x95911ce48fde715f26127d0b816ce319be6808b37a94e4187c55bdc49b43dd58"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0x95911ce48fde715f26127d0b816ce319be6808b37a94e4187c55bdc49b43dd58'`
        );
    }
};
    