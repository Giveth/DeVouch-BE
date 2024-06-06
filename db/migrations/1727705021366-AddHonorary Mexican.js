module.exports = class AddHonoraryMexican1727705021366 {
    name = "AddHonoraryMexican1727705021366";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // add organisation with name "Honorary Mexican" and schema id "0xc80d5c0209976a6c994aa6dc3680f4ad2de2dbc1aa9f46164c251ad9e5e10e09"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '0xc80d5c0209976a6c994aa6dc3680f4ad2de2dbc1aa9f46164c251ad9e5e10e09',
            'Honorary Mexican',
            '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
            '#ff0022'
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // remove organisation with name "Honorary Mexican" and schema id "0xc80d5c0209976a6c994aa6dc3680f4ad2de2dbc1aa9f46164c251ad9e5e10e09"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0xc80d5c0209976a6c994aa6dc3680f4ad2de2dbc1aa9f46164c251ad9e5e10e09'`
        );
    }
};
    