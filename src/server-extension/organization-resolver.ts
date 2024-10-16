import "reflect-metadata";
import { Arg, Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import { VouchCountPerMonth, VouchCountResult } from "./types";
import { isValidDate } from "./helper";

@Resolver()
export class OrganisationResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => VouchCountResult)
  async getOrganisationVouchCountByDate(
    @Arg("organisationId", () => String) organisationId: string,
    @Arg("fromDate", () => String) fromDate: string,
    @Arg("toDate", () => String) toDate: string
  ): Promise<VouchCountResult> {
    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      throw new Error(
        "Invalid date format. Dates must be in YYYY-MM-DD format."
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from > to) {
      throw new Error("`fromDate` cannot be later than `toDate`.");
    }
    try {
      const manager = await this.tx();

      const queryPerMonth = `
        SELECT 
          to_char(project_attestation.attest_timestamp, 'YYYY-MM') AS date, 
          COUNT(*) AS total_count,
          SUM(CASE WHEN project_attestation.comment IS NOT NULL AND project_attestation.comment != '' THEN 1 ELSE 0 END) AS count_with_comments
        FROM 
          project_attestation
        LEFT JOIN attestor_organisation 
          ON project_attestation.attestor_organisation_id = attestor_organisation.id
        WHERE 
          attestor_organisation.organisation_id = $1
          AND project_attestation.vouch = true
          AND project_attestation.attest_timestamp BETWEEN $2 AND $3
        GROUP BY 
          to_char(project_attestation.attest_timestamp, 'YYYY-MM')
        ORDER BY 
          date;
      `;

      const resultPerMonth = await manager.query(queryPerMonth, [
        organisationId,
        fromDate,
        toDate,
      ]);

      const totalPerMonth: VouchCountPerMonth[] = resultPerMonth.map(
        (row: any) => ({
          date: row.date,
          totalCount: row.total_count,
          countWithComments: row.count_with_comments,
          countWithoutComments: row.total_count - row.count_with_comments,
        })
      );

      return {
        total: totalPerMonth.reduce((acc, row) => acc + row.totalCount, 0),
        totalPerMonth,
      };
    } catch (error: any) {
      console.error("Error fetching vouch count by date:", error);
      throw new Error(`Failed to fetch vouch count by date: ${error.message}`);
    }
  }
}