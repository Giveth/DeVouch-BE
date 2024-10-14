import "reflect-metadata";
import { GraphQLResolveInfo } from "graphql";
import { Arg, Info, Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import { ProjectType } from "./types"; // Custom ProjectType
import { getSelectedFields } from "./helper";

@Resolver()
export class ProjectResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => [ProjectType])
  async getProjectsSortedByVouchOrFlag(
    @Arg("orgIds", () => [String]) orgIds: string[], // Array of organization IDs
    @Arg("sortBy", () => String) sortBy: "vouch" | "flag", // Sort by vouch or flag
    @Info() info: GraphQLResolveInfo
  ): Promise<ProjectType[]> {
    try {
      const manager = await this.tx();

      // Determine whether we are sorting by vouches (true) or flags (false)
      const vouchValue = sortBy === "vouch" ? true : false;

      console.log("orgIds", orgIds);

      const selectedFields = getSelectedFields(info);
      const fields = selectedFields.join(", ");

      // Create raw SQL query
      const query = `
    SELECT 
      ${fields}, 
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
      SUM(organisation_project.count) DESC;
  `;

      // Execute the query and pass in the organization IDs and vouchValue as parameters
      const rawProjects = await manager.query(query);

      // Map raw SQL result into ProjectType
      return rawProjects.map((row: any) => ({
        id: row.project_id,
        title: row.project_title ?? "Untitled Project", // Handle null titles
        attestedOrganisations: [
          {
            vouch: vouchValue,
            count: row.total_count,
            organisation: {
              id: row.org_id,
              name: row.org_name,
            },
          },
        ],
      }));
    } catch (error) {
      console.error("Error fetching and sorting projects:", error);
      throw new Error("Failed to fetch and sort projects");
    }
  }
}
