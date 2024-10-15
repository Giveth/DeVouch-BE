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

      // Query to get total vouches within the date range
      const queryTotal = `
        SELECT 
          SUM(organisation_project.count) AS total
        FROM 
          organisation_project
        WHERE 
          organisation_project.organisation_id = $1
          AND organisation_project.vouch = true
          AND organisation_project.attestTimestamp BETWEEN $2 AND $3;
      `;

      const resultTotal = await manager.query(queryTotal, [
        organisationId,
        fromDate,
        toDate,
      ]);

      const total = resultTotal[0]?.total || 0;

      // Query to get vouches per month within the date range
      const queryPerMonth = `
        SELECT 
          to_char(organisation_project.attestTimestamp, 'YYYY-MM') AS month, 
          SUM(organisation_project.count) AS count
        FROM 
          organisation_project
        WHERE 
          organisation_project.organisation_id = $1
          AND organisation_project.vouch = true
          AND organisation_project.attestTimestamp BETWEEN $2 AND $3
        GROUP BY 
          to_char(organisation_project.attestTimestamp, 'YYYY-MM')
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
