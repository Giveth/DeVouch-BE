module.exports = class AddDAOLabs1794906790970 {
    name = "AddDAOLabs1794906790970";

    async up(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // add organisation with name "DAO Labs" and schema id "0x2636e89a6a34edab287c8a0796b0fd4ad5cbf1b30a1649e4e42535c3d2cb77e4"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
          VALUES (
            '0x2636e89a6a34edab287c8a0796b0fd4ad5cbf1b30a1649e4e42535c3d2cb77e4',
            'DAO Labs',
            '0x6a8e912606215f04f366e41697774c1057f0aef6',
            '#335ef5',
            154653591
          )`
        );
    }
    
    async down(db) {
        const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
        if (SQUID_NETWORK !== "optimism-mainnet") return;
        // remove organisation with name "DAO Labs" and schema id "0x2636e89a6a34edab287c8a0796b0fd4ad5cbf1b30a1649e4e42535c3d2cb77e4"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0x2636e89a6a34edab287c8a0796b0fd4ad5cbf1b30a1649e4e42535c3d2cb77e4'`
        );
    }
};
    