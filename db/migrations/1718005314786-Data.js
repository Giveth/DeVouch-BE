module.exports = class Data1718005314786 {
    name = 'Data1718005314786'

    async up(db) {
        await db.query(`ALTER TABLE "project" ADD "description_summary" text`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "project" DROP COLUMN "description_summary"`)
    }
}
