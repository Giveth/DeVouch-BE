import "reflect-metadata";
import { GraphQLResolveInfo } from "graphql";
import { Arg, Info, Query, Resolver } from "type-graphql";
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
    @Arg("sortBy", () => String, { nullable: true })
    sortBy: EProjectSort = EProjectSort.HIGHEST_VOUCH_COUNT,
    @Arg("limit", () => Number, { nullable: true }) limit: number = 10,
    @Arg("offset", () => Number, { nullable: true }) offset: number = 0
  ): Promise<ProjectsSortedByVouchOrFlagType[]> {
    try {
      const manager = await this.tx();

      const sortInfo = getProjectSortBy(sortBy);
      const vouchValue = sortInfo.sortBy === "vouch";

      // Initialize conditions and parameters for dynamic query construction
      const conditions = [];
      const parameters = [];
      let paramIndex = 1;

      // Add organization filter if organizations are provided
      if (organizations && organizations.length > 0) {
        conditions.push(`organisation.id = ANY($${paramIndex})`);
        parameters.push(organizations);
        paramIndex++;
      }

      // Add source filter if sources are provided
      if (sources && sources.length > 0) {
        conditions.push(`project.source = ANY($${paramIndex})`);
        parameters.push(sources);
        paramIndex++;
      }

      // Add vouch/flag condition
      conditions.push(`organisation_project.vouch = $${paramIndex}`);
      parameters.push(vouchValue);
      paramIndex++;

      // Construct WHERE clause
      const whereClause =
        conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

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
          SUM(organisation_project.count) ${sortInfo.order}
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex};
      `;

      // Execute the query with parameters
      const rawProjects = await manager.query(query, parameters);

      return rawProjects;
    } catch (error) {
      console.error("Error fetching and sorting projects:", error);
      throw new Error("Failed to fetch and sort projects");
    }
  }
}
