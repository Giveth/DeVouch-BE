module.exports = class Data1717941249030 {
    name = 'Data1717941249030'

    async up(db) {
        await db.query(`ALTER TABLE "project" ADD "description_html" text`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "project" DROP COLUMN "description_html"`)
    }
}
