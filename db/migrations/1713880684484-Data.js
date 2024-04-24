module.exports = class Data1713880684484 {
    name = 'Data1713880684484'

    async up(db) {
        await db.query(`CREATE TABLE "attester" ("id" character varying NOT NULL, CONSTRAINT "PK_9a4a4be6c9c1431b0bcb10919ea" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "organisation" ("id" character varying NOT NULL, "name" text NOT NULL, "schema_uid" text NOT NULL, "schema_user_field" text NOT NULL, "issuer" text NOT NULL, "color" text, CONSTRAINT "PK_c725ae234ef1b74cce43d2d00c1" PRIMARY KEY ("id"))`)
        await db.query(`CREATE UNIQUE INDEX "IDX_d9428f9c8e3052d6617e3aab0e" ON "organisation" ("name") `)
        await db.query(`CREATE TABLE "attester_organisation" ("id" character varying NOT NULL, "attest_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL, "attester_id" character varying, "organisation_id" character varying, CONSTRAINT "PK_c442cbdb1cb06fee10880999cb1" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_781187b47d99696907c61a05b4" ON "attester_organisation" ("attester_id") `)
        await db.query(`CREATE INDEX "IDX_37dcdd599bcce866cf9cfd64cf" ON "attester_organisation" ("organisation_id") `)
        await db.query(`CREATE TABLE "project" ("id" character varying NOT NULL, "total_vouches" integer NOT NULL, "total_flags" integer NOT NULL, "last_updated_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "project_attestation" ("id" character varying NOT NULL, "value" boolean NOT NULL, "tx_hash" text NOT NULL, "revoked" boolean NOT NULL, "attester_organisation_id" character varying, "project_id" character varying, CONSTRAINT "PK_b54887e7eb9193e705303c2b0a0" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_7fa07b250bfd14884fe9d530e5" ON "project_attestation" ("attester_organisation_id") `)
        await db.query(`CREATE INDEX "IDX_1082147528db937cb5b50fb2a0" ON "project_attestation" ("project_id") `)
        await db.query(`ALTER TABLE "attester_organisation" ADD CONSTRAINT "FK_781187b47d99696907c61a05b47" FOREIGN KEY ("attester_id") REFERENCES "attester"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "attester_organisation" ADD CONSTRAINT "FK_37dcdd599bcce866cf9cfd64cff" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "project_attestation" ADD CONSTRAINT "FK_7fa07b250bfd14884fe9d530e5b" FOREIGN KEY ("attester_organisation_id") REFERENCES "attester_organisation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "project_attestation" ADD CONSTRAINT "FK_1082147528db937cb5b50fb2a05" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
    }

    async down(db) {
        await db.query(`DROP TABLE "attester"`)
        await db.query(`DROP TABLE "organisation"`)
        await db.query(`DROP INDEX "public"."IDX_d9428f9c8e3052d6617e3aab0e"`)
        await db.query(`DROP TABLE "attester_organisation"`)
        await db.query(`DROP INDEX "public"."IDX_781187b47d99696907c61a05b4"`)
        await db.query(`DROP INDEX "public"."IDX_37dcdd599bcce866cf9cfd64cf"`)
        await db.query(`DROP TABLE "project"`)
        await db.query(`DROP TABLE "project_attestation"`)
        await db.query(`DROP INDEX "public"."IDX_7fa07b250bfd14884fe9d530e5"`)
        await db.query(`DROP INDEX "public"."IDX_1082147528db937cb5b50fb2a0"`)
        await db.query(`ALTER TABLE "attester_organisation" DROP CONSTRAINT "FK_781187b47d99696907c61a05b47"`)
        await db.query(`ALTER TABLE "attester_organisation" DROP CONSTRAINT "FK_37dcdd599bcce866cf9cfd64cff"`)
        await db.query(`ALTER TABLE "project_attestation" DROP CONSTRAINT "FK_7fa07b250bfd14884fe9d530e5b"`)
        await db.query(`ALTER TABLE "project_attestation" DROP CONSTRAINT "FK_1082147528db937cb5b50fb2a05"`)
    }
}
