import "reflect-metadata";
import { Arg, Int, Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import { EProjectSort, ProjectsSortedByVouchOrFlagType } from "./types";
import { getProjectSortBy } from "./helper";

@Resolver()
export class ProjectResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => [ProjectsSortedByVouchOrFlagType])
  async getProjectsSortedByVouchOrFlag(
    @Arg("organizations", () => [String], { nullable: true })
    organizations?: string[],
    @Arg("sources", () => [String], { nullable: true }) sources?: string[],
    @Arg("rfRounds", () => [Int], { nullable: true }) rfRounds?: number[],
    @Arg("sortBy", () => String, { nullable: true })
    sortBy: EProjectSort = EProjectSort.HIGHEST_VOUCH_COUNT,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 10,
    @Arg("offset", () => Int, { nullable: true }) offset: number = 0
  ): Promise<ProjectsSortedByVouchOrFlagType[]> {
    try {
      const manager = await this.tx();

      const sortInfo = getProjectSortBy(sortBy);
      const vouchValue = sortInfo.sortBy === "vouch";

      // Initialize conditions and parameters for dynamic query construction
      const conditions = ["project.imported = true"];
      const parameters = [];
      let paramIndex = 1;

      // Add organization filter if organizations are provided
      if (organizations && organizations.length > 0) {
        conditions.push(`organisation.id = ANY($${paramIndex}::text[])`);
        parameters.push(organizations);
        paramIndex++;
      }

      // Add vouch/flag condition
      conditions.push(`organisation_project.vouch = $${paramIndex}`);
      parameters.push(vouchValue);
      paramIndex++;

      // Initialize OR conditions
      const orConditions = [];

      // Separate sources into 'rf' and others
      let sourcesWithoutRF: string[] = [];
      let hasRFSource = false;

      if (sources && sources.length > 0) {
        hasRFSource = sources.includes("rf");
        sourcesWithoutRF = sources.filter((s) => s !== "rf");
      }

      // Add condition for sources excluding 'rf'
      if (sourcesWithoutRF.length > 0) {
        orConditions.push(`project.source = ANY($${paramIndex}::text[])`);
        parameters.push(sourcesWithoutRF);
        paramIndex++;
      }

      // Add condition for 'rf' source
      if (hasRFSource) {
        if (rfRounds && rfRounds.length > 0) {
          orConditions.push(
            `(project.source = 'rf' AND project.rf_rounds && $${paramIndex}::int[])`
          );
          parameters.push(rfRounds);
          paramIndex++;
        } else {
          orConditions.push(`project.source = 'rf'`);
        }
      }

      // If sources is not provided but rfRounds are provided
      if (
        (!sources || sources.length === 0) &&
        rfRounds &&
        rfRounds.length > 0
      ) {
        orConditions.push(
          `(project.source = 'rf' AND project.rf_rounds && $${paramIndex}::int[])`
        );
        parameters.push(rfRounds);
        paramIndex++;
      }

      // Construct WHERE clause
      const whereClauseParts = [];

      if (conditions.length > 0) {
        whereClauseParts.push(conditions.join(" AND "));
      }

      if (orConditions.length > 0) {
        whereClauseParts.push("(" + orConditions.join(" OR ") + ")");
      }

      const whereClause =
        whereClauseParts.length > 0
          ? "WHERE " + whereClauseParts.join(" AND ")
          : "";

      // Add limit and offset parameters
      parameters.push(limit);
      const limitParamIndex = paramIndex;
      paramIndex++;

      parameters.push(offset);
      const offsetParamIndex = paramIndex;
      paramIndex++;

      // Construct the final query
      const query = `
        SELECT 
          project.id,
          project.source,
          project.rf_rounds,
          SUM(organisation_project.count) AS total_count 
        FROM 
          project 
        LEFT JOIN organisation_project 
          ON project.id = organisation_project.project_id 
        LEFT JOIN organisation 
          ON organisation_project.organisation_id = organisation.id 
        ${whereClause}
        GROUP BY 
          project.id
        ORDER BY 
          SUM(organisation_project.count) ${sortInfo.order === "ASC" ? "ASC" : "DESC"}
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex};
      `;

      // Execute the query with parameters
      const rawProjects = await manager.query(query, parameters);
      return rawProjects.map(
        (rawProject: {
          id: string;
          source: string;
          rf_rounds: number[] | null;
          total_count: number;
        }) => ({
          ...rawProject,
          rfRounds: rawProject.rf_rounds,
        })
      );
    } catch (error) {
      console.error("Error fetching and sorting projects:", error);
      throw new Error("Failed to fetch and sort projects");
    }
  }
}
