module.exports = class AddDegen1727705168214 {
    name = "AddDegen1727705168214";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // add organisation with name "Degen" and schema id "0xa8122bdee6c8949308c097c2b28ab3d154bf4f27bf5a1e850a91884498b7de8c"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '0xa8122bdee6c8949308c097c2b28ab3d154bf4f27bf5a1e850a91884498b7de8c',
            'Degen',
            '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
            '#fff3c4'
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // remove organisation with name "Degen" and schema id "0xa8122bdee6c8949308c097c2b28ab3d154bf4f27bf5a1e850a91884498b7de8c"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0xa8122bdee6c8949308c097c2b28ab3d154bf4f27bf5a1e850a91884498b7de8c'`
        );
    }
};
    