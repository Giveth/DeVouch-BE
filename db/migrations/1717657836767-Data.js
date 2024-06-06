module.exports = class Data1717657836767 {
    name = 'Data1717657836767'

    async up(db) {
        await db.query(`ALTER TABLE "project" ADD "imported" boolean`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "project" DROP COLUMN "imported"`)
    }
}
