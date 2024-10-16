import "reflect-metadata";
import { GraphQLResolveInfo } from "graphql";
import { Arg, Info, Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import { EProjectSort, ProjectsSortedByVouchOrFlagType } from "./types"; // Custom ProjectType
import { getProjectSortBy } from "./helper";

@Resolver()
export class ProjectResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => [ProjectsSortedByVouchOrFlagType])
  async getProjectsSortedByVouchOrFlag(
    @Arg("orgIds", () => [String]) orgIds: string[],
    @Arg("sortBy", () => String) sortBy: EProjectSort,
    @Arg("limit", () => Number, { nullable: true }) limit: number = 10,
    @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    @Info() info: GraphQLResolveInfo
  ): Promise<ProjectsSortedByVouchOrFlagType[]> {
    try {
      const manager = await this.tx();

      const sortInfo = getProjectSortBy(sortBy);

      const vouchValue = sortInfo.sortBy === "vouch";

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
        WHERE 
          organisation.id = ANY($1)
          AND organisation_project.vouch = $2
        GROUP BY 
          project.id
        ORDER BY 
          SUM(organisation_project.count) ${sortInfo.order}
        LIMIT $3 OFFSET $4;
      `;

      const rawProjects = await manager.query(query, [
        orgIds,
        vouchValue,
        limit,
        offset,
      ]);

      return rawProjects;
    } catch (error) {
      console.error("Error fetching and sorting projects:", error);
      throw new Error("Failed to fetch and sort projects");
    }
  }
}
