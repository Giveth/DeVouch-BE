module.exports = class Data1717661742627 {
    name = 'Data1717661742627'

    async up(db) {
        await db.query(`ALTER TABLE "project" RENAME COLUMN "slug" TO "url"`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "project" RENAME COLUMN "url" TO "slug"`)
    }
}
