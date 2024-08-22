module.exports = class Data1724279465327 {
  name = "Data1724279465327";

  async up(db) {
    await db.query(`ALTER TABLE "project" DROP COLUMN "source_status"`);
    await db.query(`ALTER TABLE "project" ADD "rf_rounds" integer array`);
  }

  async down(db) {
    await db.query(`ALTER TABLE "project" DROP COLUMN "rf_rounds"`);
    await db.query(`ALTER TABLE "project" ADD "source_status" text`);
  }
};
