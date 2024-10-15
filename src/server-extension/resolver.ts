import "reflect-metadata";
import { GraphQLResolveInfo } from "graphql";
import { Arg, Info, Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import { ProjectsSortedByVouchOrFlagType } from "./types"; // Custom ProjectType

@Resolver()
export class ProjectResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => [ProjectsSortedByVouchOrFlagType])
  async getProjectsSortedByVouchOrFlag(
    @Arg("orgIds", () => [String]) orgIds: string[],
    @Arg("sortBy", () => String) sortBy: "vouch" | "flag",
    @Arg("limit", () => Number, { nullable: true }) limit: number = 10,
    @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    @Info() info: GraphQLResolveInfo
  ): Promise<ProjectsSortedByVouchOrFlagType[]> {
    try {
      const manager = await this.tx();

      const vouchValue = sortBy === "vouch";

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
          organisation.id IN (${orgIds.map((orgId) => `'${orgId}'`).join(",")}) 
          AND organisation_project.vouch = ${vouchValue}
        GROUP BY 
          project.id, 
          organisation_project.id, 
          organisation.id 
        ORDER BY 
          SUM(organisation_project.count) DESC
          LIMIT ${limit} OFFSET ${offset};
  `;

      const rawProjects = await manager.query(query);

      return rawProjects;
    } catch (error) {
      console.error("Error fetching and sorting projects:", error);
      throw new Error("Failed to fetch and sort projects");
    }
  }
}
