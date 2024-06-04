module.exports = class AddPizzaLovers1727513623446 {
    name = "AddPizzaLovers1727513623446";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // add organisation with name "Pizza Lovers" and schema id "0x9224f06bd11d0076dbcb28e4f0c654d78cb071930653510360a3a00518ad1710"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '0x9224f06bd11d0076dbcb28e4f0c654d78cb071930653510360a3a00518ad1710',
            'Pizza Lovers',
            '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
            '#db284a'
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "eth-sepolia") return;
        // remove organisation with name "Pizza Lovers" and schema id "0x9224f06bd11d0076dbcb28e4f0c654d78cb071930653510360a3a00518ad1710"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0x9224f06bd11d0076dbcb28e4f0c654d78cb071930653510360a3a00518ad1710'`
        );
    }
};
    