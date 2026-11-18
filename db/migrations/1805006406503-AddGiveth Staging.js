const ORGANISATION_ID =
  "0x95911ce48fde715f26127d0b816ce319be6808b37a94e4187c55bdc49b43dd58";
const ORGANISATION_NETWORK = "eth-sepolia";

module.exports = class AddGivethStaging1805006406503 {
  name = "AddGivethStaging1805006406503";

  async up(db) {
    const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
    if (SQUID_NETWORK !== ORGANISATION_NETWORK) return;
    // add organisation with name "Giveth Staging" and schema id "0x95911ce48fde715f26127d0b816ce319be6808b37a94e4187c55bdc49b43dd58"
    await db.query(
      `INSERT INTO "organisation" ("id", "name", "issuer", "color", "start_block")
          VALUES (
            '${ORGANISATION_ID}',
            'Giveth Staging',
            '0x29ee09bd0f7f41ecd083ad2708df17691065790b',
            '#e1458d',
            null
          )`
    );
  }

  /**
   * Removes the organisation together with everything indexed for it. The
   * migration runner wraps a revert in one transaction, so a failure at any
   * step leaves the database, and the migration record, as they were.
   *
   * After a revert and a re-apply the organisation is empty: the indexer does
   * not go back to blocks it has already processed, so the earlier membership
   * attestations are not read again. The issuer has to attest every member
   * again (and members have to vouch again) once the organisation is back.
   */
  async down(db) {
    const SQUID_NETWORK = process.env.SQUID_NETWORK || "eth-sepolia";
    if (SQUID_NETWORK !== ORGANISATION_NETWORK) {
      // up() inserted nothing under this network, so there is normally nothing
      // to remove. If the row is here anyway, this database was migrated as
      // eth-sepolia: refuse, rather than report a revert that left it behind.
      const existing = await db.query(
        `SELECT 1 FROM "organisation" WHERE "id" = $1`,
        [ORGANISATION_ID]
      );
      if (existing.length > 0) {
        throw new Error(
          `Organisation "Giveth Staging" exists but SQUID_NETWORK is "${SQUID_NETWORK}". ` +
            `Revert this migration with SQUID_NETWORK=${ORGANISATION_NETWORK}.`
        );
      }
      return;
    }

    // Projects whose counters include a vouch or flag made as a member of
    // this organisation; they are recounted once those rows are gone.
    const affectedProjects = await db.query(
      `SELECT DISTINCT pa."project_id" AS "id"
         FROM "project_attestation" pa
         INNER JOIN "attestor_organisation" ao
           ON pa."attestor_organisation_id" = ao."id"
        WHERE ao."organisation_id" = $1
          AND pa."project_id" IS NOT NULL`,
      [ORGANISATION_ID]
    );

    // Dependency order: vouches and flags reference a membership, and the
    // memberships and per-organisation counters reference the organisation.
    await db.query(
      `DELETE FROM "project_attestation"
        WHERE "attestor_organisation_id" IN (
          SELECT "id" FROM "attestor_organisation" WHERE "organisation_id" = $1
        )`,
      [ORGANISATION_ID]
    );
    await db.query(
      `DELETE FROM "organisation_project" WHERE "organisation_id" = $1`,
      [ORGANISATION_ID]
    );
    await db.query(
      `DELETE FROM "attestor_organisation" WHERE "organisation_id" = $1`,
      [ORGANISATION_ID]
    );

    // Same totals the indexer keeps (see getProjectStats): attestations made
    // through a membership of an existing organisation, split by vouch/flag.
    // The other organisations' rows in "organisation_project" are unaffected.
    if (affectedProjects.length > 0) {
      await db.query(
        `UPDATE "project" p
            SET "total_vouches" = s."vouches",
                "total_flags" = s."flags",
                "total_attests" = s."vouches" + s."flags"
           FROM (
             SELECT pr."id",
                    COUNT(og."id") FILTER (WHERE pa."vouch") AS "vouches",
                    COUNT(og."id") FILTER (WHERE NOT pa."vouch") AS "flags"
               FROM "project" pr
               LEFT JOIN "project_attestation" pa ON pa."project_id" = pr."id"
               LEFT JOIN "attestor_organisation" ao
                 ON pa."attestor_organisation_id" = ao."id"
               LEFT JOIN "organisation" og ON ao."organisation_id" = og."id"
              WHERE pr."id" = ANY($1)
              GROUP BY pr."id"
           ) s
          WHERE p."id" = s."id"`,
        [affectedProjects.map((project) => project.id)]
      );
    }

    // remove organisation with name "Giveth Staging" and schema id "0x95911ce48fde715f26127d0b816ce319be6808b37a94e4187c55bdc49b43dd58"
    await db.query(`DELETE FROM "organisation" WHERE "id" = $1`, [
      ORGANISATION_ID,
    ]);
  }
};
