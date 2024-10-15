import "reflect-metadata";
import { Arg, Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import { VouchCountPerMonth, VouchCountResult } from "./types";

@Resolver()
export class OrganisationResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => VouchCountResult)
  async getOrganisationVouchCountByDate(
    @Arg("organisationId", () => String) organisationId: string,
    @Arg("fromDate", () => String) fromDate: string,
    @Arg("toDate", () => String) toDate: string
  ): Promise<VouchCountResult> {
    try {
      const manager = await this.tx();

      // Updated query to get total vouches, with comments and without comments, per month
      const queryPerMonth = `
        SELECT 
          to_char(project_attestation.attest_timestamp, 'YYYY-MM') AS date, 
          COUNT(*) AS total_count,
          SUM(CASE WHEN project_attestation.comment IS NOT NULL THEN 1 ELSE 0 END) AS count_with_comments,
          SUM(CASE WHEN project_attestation.comment IS NULL THEN 1 ELSE 0 END) AS count_without_comments
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

      // Execute the query with the passed variables
      const resultPerMonth = await manager.query(queryPerMonth, [
        organisationId,
        fromDate,
        toDate,
      ]);

      // Map the results to the VouchCountPerMonth interface
      const totalPerMonth: VouchCountPerMonth[] = resultPerMonth.map(
        (row: any) => ({
          date: row.date,
          totalCount: row.total_count,
          countWithComments: row.count_with_comments,
          countWithoutComments: row.count_without_comments,
        })
      );

      // Return the result with totals and per month data
      return {
        total: totalPerMonth.reduce((acc, row) => acc + row.totalCount, 0), // Sum total counts
        totalPerMonth,
      };
    } catch (error) {
      console.error("Error fetching vouch count by date:", error);
      throw new Error("Failed to fetch vouch count by date");
    }
  }
}
