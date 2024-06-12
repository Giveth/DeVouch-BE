module.exports = class Data1718184531403 {
    name = 'Data1718184531403'

    async up(db) {
        await db.query(`ALTER TABLE "organisation" ADD "start_block" integer`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "organisation" DROP COLUMN "start_block"`)
    }
}
