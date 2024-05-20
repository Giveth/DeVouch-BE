module.exports = class Data1716207083370 {
    name = 'Data1716207083370'

    async up(db) {
        await db.query(`ALTER TABLE "project" ADD "slug" text`)
        await db.query(`ALTER TABLE "project" ADD "image" text`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "project" DROP COLUMN "slug"`)
        await db.query(`ALTER TABLE "project" DROP COLUMN "image"`)
    }
}
