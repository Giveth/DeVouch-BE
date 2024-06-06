module.exports = class Data1717658264897 {
  name = "Data1717658264897";

  async up(db) {
    // fill the new column with default values
    await db.query(`UPDATE "project" SET "imported" = false`);
    await db.query(
      `ALTER TABLE "project" ALTER COLUMN "imported" SET NOT NULL`
    );
    await db.query(
      `CREATE INDEX "IDX_408502a376cb8a2d0eb8f94ad5" ON "project" ("imported") `
    );
  }

  async down(db) {
    await db.query(
      `ALTER TABLE "project" ALTER COLUMN "imported" DROP NOT NULL`
    );
    await db.query(`DROP INDEX "public"."IDX_408502a376cb8a2d0eb8f94ad5"`);
  }
};
