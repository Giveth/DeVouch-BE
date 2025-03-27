module.exports = class AddProofofRegen1743772119156 {
    name = "AddProofofRegen1743772119156";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // add organisation with name "Proof of Regen" and schema id "0xff8ed1808683dbc70ef77b0b77e7f2aa718a53d294607b149383971afa723410"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
          VALUES (
            '0xff8ed1808683dbc70ef77b0b77e7f2aa718a53d294607b149383971afa723410',
            'Proof of Regen',
            '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
            '#f5ea67',
            7219293
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // remove organisation with name "Proof of Regen" and schema id "0xff8ed1808683dbc70ef77b0b77e7f2aa718a53d294607b149383971afa723410"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0xff8ed1808683dbc70ef77b0b77e7f2aa718a53d294607b149383971afa723410'`
        );
    }
};
    