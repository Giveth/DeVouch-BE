module.exports = class ProjectStatsMatiralizeView1720600963052 {
  name = "ProjectStatsMatiralizeView1720600963052";

  async up(db) {
    await db.query(`
        DROP MATERIALIZED VIEW IF EXISTS PROJECT_STATS_VIEW;

        DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_type WHERE typname = 'name_count_type'
                    ) THEN
                        CREATE TYPE name_count_type AS (
                            name TEXT,
                            count INTEGER
                        );
                    END IF;
                END $$;
        
        CREATE MATERIALIZED VIEW PROJECT_STATS_VIEW AS
        WITH
            ORG_ATTESTATIONS AS (
                SELECT
                    PR_AT.PROJECT_ID,
                    OG.NAME,
                    PR_AT.VOUCH
                FROM
                    PROJECT_ATTESTATION AS PR_AT
                    INNER JOIN ATTESTOR_ORGANISATION AS AT_OG ON PR_AT.ATTESTOR_ORGANISATION_ID = AT_OG.ID
                    INNER JOIN ORGANISATION AS OG ON AT_OG.ORGANISATION_ID = OG.ID
                WHERE
                    PR_AT.REVOKED = FALSE
                    AND AT_OG.REVOKED = FALSE
            ),
            PR_ORG AS (
                SELECT
                    PROJECT_ID,
                    ARRAY_AGG(DISTINCT ORG_ATTESTATIONS.NAME) AS UNIQ_ORGS
                FROM
                    ORG_ATTESTATIONS
                GROUP BY
                    PROJECT_ID
            ),
            PR_ORG_V AS (
                SELECT
                    ORG_ATTESTATIONS.PROJECT_ID,
                    ORG_ATTESTATIONS.NAME,
                    ORG_ATTESTATIONS.VOUCH,
                    COUNT(*)
                FROM
                    ORG_ATTESTATIONS
                GROUP BY
                    ORG_ATTESTATIONS.PROJECT_ID,
                    ORG_ATTESTATIONS.NAME,
                    ORG_ATTESTATIONS.VOUCH
            ),
            ORG_FLAG_AGG AS (
                SELECT
                    PR_ORG_V.PROJECT_ID,
                    ARRAY_AGG(
                        ROW (PR_ORG_V.NAME, PR_ORG_V.COUNT)::NAME_COUNT_TYPE
                    ) AS ORG_FLAGS,
                    SUM(PR_ORG_V.COUNT) AS PR_TOTAL_FLAGS
                FROM
                    PR_ORG_V
                WHERE
                    PR_ORG_V.VOUCH = FALSE
                GROUP BY
                    PR_ORG_V.PROJECT_ID
            ),
            ORG_ATTESTATIONS_AGG AS (
                SELECT
                    PR_ORG_V.PROJECT_ID,
                    ARRAY_AGG(
                        ROW (PR_ORG_V.NAME, PR_ORG_V.COUNT)::NAME_COUNT_TYPE
                    ) AS ORG_ATTESTATIONSES,
                    SUM(PR_ORG_V.COUNT) AS PR_TOTAL_VOUCHES
                FROM
                    PR_ORG_V
                WHERE
                    PR_ORG_V.VOUCH = TRUE
                GROUP BY
                    PR_ORG_V.PROJECT_ID
            )
        SELECT
            ID,
            PR_TOTAL_FLAGS,
            PR_TOTAL_VOUCHES,
            PR_TOTAL_FLAGS + PR_TOTAL_VOUCHES AS TOTAL_ATTESTATIONS,
            ORG_FLAGS,
            ORG_ATTESTATIONSES,
            UNIQ_ORGS
        FROM
            PROJECT
            LEFT JOIN PR_ORG ON PR_ORG.PROJECT_ID = PROJECT.ID
            LEFT JOIN ORG_FLAG_AGG ON ORG_FLAG_AGG.PROJECT_ID = PROJECT.ID
            LEFT JOIN ORG_ATTESTATIONS_AGG ON ORG_ATTESTATIONS_AGG.PROJECT_ID = PROJECT.ID;
    
        `);
    await db.query(
      `CREATE INDEX idx_project_stats_view_id ON project_stats_view (ID);`
    );
    await db.query(
      `CREATE INDEX idx_project_stats_view_uniq_orgs ON project_stats_view(UNIQ_ORGS);`
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS idx_project_stats_view_id`);
    await db.query(`DROP MATERIALIZED VIEW IF EXISTS project_stats_view`);
    await db.query(`DROP TYPE IF EXISTS name_count_type CASCADE`);
  }
};
