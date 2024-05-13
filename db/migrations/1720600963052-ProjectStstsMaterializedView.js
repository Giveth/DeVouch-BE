module.exports = class ProjectStatsMatiralizeView1720600963052 {
  name = "ProjectStatsMatiralizeView1720600963052";

  async up(db) {
    await db.query(`
        DROP MATERIALIZED VIEW IF EXISTS project_stats_view;

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
        
        CREATE MATERIALIZED VIEW project_stats_view AS
        WITH
            ORG_VOUCH AS (
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
            PR_ORG_V AS (
                SELECT
                    ORG_VOUCH.PROJECT_ID,
                    ORG_VOUCH.NAME,
                    ORG_VOUCH.VOUCH,
                    COUNT(*)
                FROM
                    ORG_VOUCH
                GROUP BY
                    ORG_VOUCH.PROJECT_ID,
                    ORG_VOUCH.NAME,
                    ORG_VOUCH.VOUCH
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
            ORG_VOUCH_AGG AS (
                SELECT
                    PR_ORG_V.PROJECT_ID,
                    ARRAY_AGG(
                        ROW (PR_ORG_V.NAME, PR_ORG_V.COUNT)::NAME_COUNT_TYPE
                    ) AS ORG_VOUCHES,
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
            TOTAL_VOUCHES,
            TOTAL_FLAGS,
            PR_TOTAL_FLAGS,
            PR_TOTAL_VOUCHES,
            ORG_FLAGS,
            ORG_VOUCHES
        FROM
            PROJECT
            LEFT JOIN ORG_FLAG_AGG ON ORG_FLAG_AGG.PROJECT_ID = PROJECT.ID
            LEFT JOIN ORG_VOUCH_AGG ON ORG_VOUCH_AGG.PROJECT_ID = PROJECT.ID;

        `);
    await db.query(
      `CREATE INDEX idx_project_stats_view_id ON project_stats_view (ID);`
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS idx_project_stats_view_id`);
    await db.query(`DROP MATERIALIZED VIEW IF EXISTS project_stats_view`);
    await db.query(`DROP TYPE IF EXISTS name_count_type CASCADE`);
  }
};
