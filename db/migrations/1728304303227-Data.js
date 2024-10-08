module.exports = class Data1728304303227 {
    name = 'Data1728304303227'

    async up(db) {
        await db.query(`ALTER TABLE "project" ADD "source_created_at" TIMESTAMP WITH TIME ZONE`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "project" DROP COLUMN "source_created_at"`)
    }
}
