import { Arg, Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import { Project } from "../model";
import { ProjectType } from "./types"; // Custom ProjectType
import "reflect-metadata";

@Resolver()
export class ProjectResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => [ProjectType])
  async getProjectsSortedByVouchOrFlag(
    @Arg("orgIds", () => [String]) orgIds: string[], // Array of organization IDs
    @Arg("sortBy", () => String) sortBy: "vouch" | "flag" // Sort by vouch or flag
  ): Promise<ProjectType[]> {
    try {
      const manager = await this.tx();

      // Determine whether we are sorting by vouches (true) or flags (false)
      const vouchValue = sortBy === "vouch" ? true : false;

      // Query the projects vouched or flagged by the provided organizations
      const projects = await manager
        .getRepository(Project)
        .createQueryBuilder("project")
        .leftJoinAndSelect(
          "project.attestedOrganisations",
          "organisationProject"
        )
        .leftJoinAndSelect("organisationProject.organisation", "organisation")
        .where("organisation.id IN (:...orgIds)", { orgIds }) // Filter by array of organization IDs
        .andWhere("organisationProject.vouch = :vouchValue", { vouchValue }) // Filter by vouch or flag
        .groupBy("project.id") // Group by project ID to accumulate counts
        .addGroupBy("project.title") // Group by project title as well
        .addGroupBy("organisationProject.id") // Group by organisationProject ID
        .addGroupBy("organisation.id") // Group by organisation ID
        .addGroupBy("organisation.name") // Group by organisation name
        .orderBy("SUM(organisationProject.count)", "DESC") // Order by the sum of counts
        .getMany();

      // Map the results to ProjectType
      return projects.map((project) => ({
        id: project.id,
        title: project.title ?? "Untitled Project", // Handle null titles
        attestedOrganisations: project.attestedOrganisations.map(
          (orgProject) => ({
            vouch: orgProject.vouch,
            count: orgProject.count,
            organisation: {
              id: orgProject.organisation.id,
              name: orgProject.organisation.name,
            },
          })
        ),
      }));
    } catch (error) {
      console.error("Error fetching and sorting projects:", error);
      throw new Error("Failed to fetch and sort projects");
    }
  }
}
