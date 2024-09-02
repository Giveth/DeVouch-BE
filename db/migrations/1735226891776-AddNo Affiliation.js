const ethers = require("ethers");
const easSdk = require("@ethereum-attestation-service/eas-sdk");

const ZERO_UID = easSdk.ZERO_BYTES32;
module.exports = class AddNoAffiliation1735226891776 {
  name = "AddNoAffiliation1735226891776";

  async up(db) {
    // Add organisation with name "No Affiliation"
    await db.query(
      `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block") 
        VALUES (
          '${ZERO_UID}',
          'No Affiliation',
          '${ethers.ZeroAddress}',
          '#0049b7',
          null
        )`
    );
  }

  async down(db) {
    // Remove organisation with name "No Affiliation"
    await db.query(
      `DELETE FROM "organisation" WHERE "id" = '${ZERO_UID}'`
    );
  }
};
