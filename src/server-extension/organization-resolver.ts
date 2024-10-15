import "reflect-metadata";
import { Arg, Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import { VouchCountResult, VouchCountPerMonth } from "./types";
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

      // Query to get total vouches within the date range (using ProjectAttestation now)
      const queryTotal = `
        SELECT 
          SUM(CASE WHEN project_attestation.vouch = true THEN 1 ELSE 0 END) AS total
        FROM 
          project_attestation
        LEFT JOIN attestor_organisation 
          ON project_attestation.attestor_organisation_id = attestor_organisation.id
        WHERE 
          attestor_organisation.organisation_id = $1
          AND project_attestation.vouch = true
          AND project_attestation.attest_timestamp BETWEEN $2 AND $3;
      `;

      const resultTotal = await manager.query(queryTotal, [
        organisationId,
        fromDate,
        toDate,
      ]);

      const total = resultTotal[0]?.total || 0;

      // Query to get vouches per month within the date range (using ProjectAttestation)
      const queryPerMonth = `
        SELECT 
          to_char(project_attestation.attest_timestamp, 'YYYY-MM') AS month, 
          COUNT(*) AS count
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
          month;
      `;

      const resultPerMonth = await manager.query(queryPerMonth, [
        organisationId,
        fromDate,
        toDate,
      ]);

      const totalPerMonth: VouchCountPerMonth[] = resultPerMonth.map(
        (row: any) => ({
          month: row.month,
          count: row.count,
        })
      );

      return {
        total,
        totalPerMonth,
      };
    } catch (error) {
      console.error("Error fetching vouch count by date:", error);
      throw new Error("Failed to fetch vouch count by date");
    }
  }
}
