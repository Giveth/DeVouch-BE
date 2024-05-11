
module.exports = class AddGivethVerificationTeam1715344741698 {
    name = "AddGivethVerificationTeam1715344741698";
    
    async up(db) {
        // add organisation with name "Giveth Verification Team" and schema id "0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404"
        await db.query(
        `INSERT INTO "organisation" ("id", "name", "issuer", "color") 
          VALUES (
            '0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404',
            'Giveth Verification Team',
            '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
            '#7f64cb'
          )`
        );
    }
    
    async down(db) {
        // remove organisation with name "Giveth Verification Team" and schema id "0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404"
        await db.query(
        `DELETE FROM "organisation" WHERE "id" = '0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404'`
        );
    }
};
    