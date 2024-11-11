import { Query, Resolver } from "type-graphql";
import type { EntityManager } from "typeorm";
import { AttestorsTotalCountResult } from "./attestor-resolver-types";

@Resolver()
export class AttestorResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => AttestorsTotalCountResult)
  async getAttestorsTotalCount(): Promise<AttestorsTotalCountResult> {
    try {
      const manager = await this.tx();

      // Construct the final query
      const query = `
        SELECT COUNT(DISTINCT attestor_organisation.attestor_id) AS total_unique_attesters
        FROM project_attestation
        JOIN attestor_organisation ON project_attestation.attestor_organisation_id = attestor_organisation.id;
      `;

      // Execute the query with parameters
      const rawProjects = await manager.query(query);
      console.log("rawProjects", rawProjects);

      return {
        totalCount: rawProjects[0].total_unique_attesters,
      };
    } catch (error) {
      console.error("Error counting attestors:", error);
      throw new Error("Failed to count attestors");
    }
  }
}
