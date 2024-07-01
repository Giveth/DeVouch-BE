module.exports = class Data1719825801500 {
    name = 'Data1719825801500'

    async up(db) {
        await db.query(`ALTER TABLE "project" ADD "source_status" text`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "project" DROP COLUMN "source_status"`)
    }
}
