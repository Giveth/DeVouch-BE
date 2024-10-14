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
    @Arg("orgIds", () => [String]) orgIds: string[],
    @Arg("sortBy", () => String) sortBy: "vouch" | "flag",
    @Info() info: GraphQLResolveInfo
  ): Promise<ProjectType[]> {
    try {
      const manager = await this.tx();

      const vouchValue = sortBy === "vouch" ? true : false;

      const selectedFields = getSelectedFields(info);
      console.log("selectedFields", selectedFields);
      const fields = selectedFields.join(", ");

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

      const rawProjects = await manager.query(query);

      return rawProjects;
    } catch (error) {
      console.error("Error fetching and sorting projects:", error);
      throw new Error("Failed to fetch and sort projects");
    }
  }
}
