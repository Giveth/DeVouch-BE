module.exports = class ChangeRF5OrganizationName1730125554407 {
  name = "ChangeRF5OrganizationName1730125554407";

  async up(db) {
    // Update the organisation name from 'RF 5 Voter' to 'RF 5 or 6 Voter' for the specific ID
    await db.query(`
      UPDATE "organisation" 
      SET "name" = 'RF 5 or 6 Voter' 
      WHERE "id" = '0x41513aa7b99bfea09d389c74aacedaeb13c28fb748569e9e2400109cbe284ee5' 
      AND "name" = 'RF 5 Voter';
    `);
  }

  async down(db) {
    // Revert the organisation name from 'RF 5 or 6 Voter' back to 'RF 5 Voter' for the specific ID
    await db.query(`
      UPDATE "organisation" 
      SET "name" = 'RF 5 Voter' 
      WHERE "id" = '0x41513aa7b99bfea09d389c74aacedaeb13c28fb748569e9e2400109cbe284ee5' 
      AND "name" = 'RF 5 or 6 Voter';
    `);
  }
};
