import { Arg, Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import {
  VouchCountByUser,
  VouchCountByUserResult,
  VouchCountPerMonth,
  VouchCountResult,
} from "./types";
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
    // Validate the dates
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

      let total = 0;
      let totalWithComments = 0;
      const totalPerMonth: VouchCountPerMonth[] = resultPerMonth.map(
        (row: any) => {
          const totalCount = Number(row.total_count);
          const countWithComments = Number(row.count_with_comments);
          const countWithoutComments = totalCount - countWithComments;

          total += totalCount;
          totalWithComments += countWithComments;

          return {
            date: row.date,
            totalCount,
            countWithComments,
            countWithoutComments,
          };
        }
      );

      return {
        total,
        totalWithComments,
        totalPerMonth,
      };
    } catch (error: any) {
      console.error("Error fetching vouch count by date:", error);
      throw new Error(`Failed to fetch vouch count by date: ${error.message}`);
    }
  }

  @Query(() => VouchCountByUserResult)
  async getOrganisationUserVouchCountBySource(
    @Arg("organisationId", () => String) organisationId: string,
    @Arg("source", () => String) source: string,
    @Arg("fromDate", () => String) fromDate: string,
    @Arg("toDate", () => String) toDate: string
  ): Promise<VouchCountByUserResult> {
    // Validate date format
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

      const query = `
        SELECT 
          attestor_organisation.attestor_id AS attestor_id,
          COUNT(*) AS total_count,
          SUM(CASE WHEN project_attestation.comment IS NOT NULL AND project_attestation.comment != '' THEN 1 ELSE 0 END) AS count_with_comments
        FROM 
          project_attestation
        JOIN attestor_organisation 
          ON project_attestation.attestor_organisation_id = attestor_organisation.id
        JOIN project
          ON project_attestation.project_id = project.id
        WHERE 
          attestor_organisation.organisation_id = $1
          AND project.source = $2
          AND project_attestation.vouch = true
          AND project_attestation.attest_timestamp BETWEEN $3 AND $4
        GROUP BY 
          attestor_organisation.attestor_id
        ORDER BY 
          total_count DESC;
      `;

      const params = [organisationId, source, fromDate, toDate];

      const result = await manager.query(query, params);

      let totalVouches = 0;
      let totalWithComments = 0;
      const vouchCountByUser: VouchCountByUser[] = result.map((row: any) => {
        const totalCount = Number(row.total_count);
        const countWithComments = Number(row.count_with_comments);

        totalVouches += totalCount;
        totalWithComments += countWithComments;

        return {
          attestorId: row.attestor_id,
          totalCount,
          countWithComments,
        };
      });

      return {
        totalVouches,
        totalWithComments,
        vouchCountByUser,
      };
    } catch (error: any) {
      console.error("Error fetching attestor vouch count by source:", error);
      throw new Error(
        `Failed to fetch attestor vouch count by source: ${error.message}`
      );
    }
  }
}
