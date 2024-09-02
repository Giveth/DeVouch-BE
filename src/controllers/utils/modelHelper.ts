import { DataHandlerContext } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import {
  Attestor,
  AttestorOrganisation,
  Organisation,
  OrganisationProject,
  Project,
} from "../../model";
import { getEntityMangerByContext } from "./databaseHelper";
import { ProjectStats } from "./types";
import { NO_AFFILIATION_SCHEMA, ZERO_UID } from "../../constants";

export const upsertOrganisatoinProject = async (
  ctx: DataHandlerContext<Store>,
  project: Project,
  organisationId: string,
  vouch: boolean,
  count: number
): Promise<void> => {
  const organisation = await ctx.store.get(Organisation, organisationId);
  const key = `${project.id}-${organisationId}-${vouch ? "vouch" : "flag"}`;
  const organisationProject = new OrganisationProject({
    id: key,
    project,
    organisation,
    vouch,
    count,
  });
  ctx.store.upsert(organisationProject);
};

export const updateProjectAttestationCounts = async (
  ctx: DataHandlerContext<Store>,
  project: Project
): Promise<void> => {
  const em = getEntityMangerByContext(ctx);
  const projectStats = await getProjectStats(ctx, project);

  project.totalVouches = projectStats.pr_total_vouches;
  project.totalFlags = projectStats.pr_total_flags;
  project.totalAttests = projectStats.pr_total_attestations;
  await ctx.store.upsert(project);

  await em.getRepository(OrganisationProject).delete({ project });

  for (const [orgId, count] of projectStats.org_flags) {
    await upsertOrganisatoinProject(ctx, project, orgId, false, +count);
  }

  for (const [orgId, count] of projectStats.org_vouches) {
    await upsertOrganisatoinProject(ctx, project, orgId, true, +count);
  }
};

export const getProject = async (
  ctx: DataHandlerContext<Store>,
  source: string,
  projectId: string
): Promise<Project> => {
  const id = `${source.toLocaleLowerCase()}-${projectId}`;

  let project: Project | undefined = await ctx.store.get(Project, id);

  if (!project) {
    await ctx.store.upsert(
      new Project({
        id,
        source: source.toLocaleLowerCase(),
        projectId,
        totalVouches: 0,
        totalFlags: 0,
        totalAttests: 0,
        lastUpdatedTimestamp: new Date(),
        imported: false,
      })
    );
    project = await ctx.store.findOneBy(Project, { id });
  }

  return project as Project;
};

export const getAttestor = async (
  ctx: DataHandlerContext<Store>,
  address: string
): Promise<Attestor> => {
  let attestor = await ctx.store.get(Attestor, address);
  if (!attestor) {
    await ctx.store.upsert(new Attestor({ id: address }));
    attestor = await ctx.store.get(Attestor, address);
  }

  return attestor as Attestor;
};

export const getProjectStats = async (
  ctx: DataHandlerContext<Store>,
  project: Project
): Promise<ProjectStats> => {
  const em = getEntityMangerByContext(ctx);

  const result = await em.query(
    `
    WITH
    ORG_ATTESTATIONS AS (
      SELECT
        PR_AT.PROJECT_ID,
        OG.id as org_id,
        PR_AT.VOUCH
      FROM
        PROJECT_ATTESTATION AS PR_AT
        INNER JOIN ATTESTOR_ORGANISATION AS AT_OG ON PR_AT.ATTESTOR_ORGANISATION_ID = AT_OG.ID
        INNER JOIN ORGANISATION AS OG ON AT_OG.ORGANISATION_ID = OG.ID
      WHERE
        PR_AT.PROJECT_ID = $1
    ),
    PR_ORG AS (
      SELECT
        PROJECT_ID,
        ARRAY_AGG(DISTINCT ORG_ATTESTATIONS.org_id) AS UNIQ_ORGS
      FROM
        ORG_ATTESTATIONS
        WHERE
          PROJECT_ID = $1
      GROUP BY
        PROJECT_ID
    ),
    PR_ORG_V AS (
      SELECT
        ORG_ATTESTATIONS.PROJECT_ID,
        ORG_ATTESTATIONS.org_id,
        ORG_ATTESTATIONS.VOUCH,
        COUNT(*)
      FROM
        ORG_ATTESTATIONS
      GROUP BY
        ORG_ATTESTATIONS.PROJECT_ID,
        ORG_ATTESTATIONS.org_id,
        ORG_ATTESTATIONS.VOUCH
    ),
    ORG_FLAG_AGG AS (
      SELECT
        PR_ORG_V.PROJECT_ID,
        ARRAY_AGG(ROW (PR_ORG_V.org_id, PR_ORG_V.COUNT)) AS ORG_FLAGS,
        SUM(PR_ORG_V.COUNT) AS PR_TOTAL_FLAGS
      FROM
        PR_ORG_V
      WHERE
        PR_ORG_V.VOUCH = FALSE
      GROUP BY
        PR_ORG_V.PROJECT_ID
    ),
    ORG_ATTESTATIONS_AGG AS (
      SELECT
        PR_ORG_V.PROJECT_ID,
        ARRAY_AGG(ROW (PR_ORG_V.org_id, PR_ORG_V.COUNT)) AS ORG_VOUCHES,
        SUM(PR_ORG_V.COUNT) AS PR_TOTAL_VOUCHES
      FROM
        PR_ORG_V
      WHERE
        PR_ORG_V.VOUCH = TRUE
      GROUP BY
        PR_ORG_V.PROJECT_ID
    )
  SELECT
    ID,
    PR_TOTAL_FLAGS,
    PR_TOTAL_VOUCHES,
    COALESCE(PR_TOTAL_FLAGS, 0) + COALESCE(PR_TOTAL_VOUCHES, 0) AS PR_TOTAL_ATTESTATIONS,
    ORG_FLAGS,
    ORG_VOUCHES,
    UNIQ_ORGS
  FROM
    PROJECT
    LEFT JOIN PR_ORG ON PR_ORG.PROJECT_ID = PROJECT.ID
    LEFT JOIN ORG_FLAG_AGG ON ORG_FLAG_AGG.PROJECT_ID = PROJECT.ID
    LEFT JOIN ORG_ATTESTATIONS_AGG ON ORG_ATTESTATIONS_AGG.PROJECT_ID = PROJECT.ID
  WHERE
    PROJECT.ID = $1
  `,
    [project.id]
  );

  return ProjectStats.parse(result[0]);
};

export const getOrCreateAttestorOrganisation = async (
  ctx: DataHandlerContext<Store>,
  attestor: Attestor,
  refUID?: string,
  attestTimestamp?: Date
): Promise<AttestorOrganisation | undefined> => {
  // Check if refUID is valid and not a placeholder for an empty reference
  if (refUID && refUID !== ZERO_UID) {
    try {
      // Attempt to find existing AttestorOrganisation
      const attestorOrganisation = await ctx.store.get(AttestorOrganisation, {
        where: { id: refUID.toLowerCase() },
        relations: { organisation: true, attestor: true },
      });

      if (attestorOrganisation) {
        ctx.log.debug(
          `Found existing attestorOrganisation: ${attestorOrganisation}`
        );
        return attestorOrganisation;
      }
    } catch (error) {
      ctx.log.error(`Error retrieving attestorOrganisation: ${error}`);
      return undefined;
    }
  }

  // Attempt to retrieve default organisation
  let organisation;
  try {
    if (!NO_AFFILIATION_SCHEMA) {
      ctx.log.error("NO_AFFILIATION_SCHEMA not set");
      return undefined;
    }
    organisation = await ctx.store.get(Organisation, NO_AFFILIATION_SCHEMA);
  } catch (error) {
    ctx.log.error(`Error retrieving No Affiliation organisation: ${error}`);
    return undefined;
  }

  if (!organisation) {
    ctx.log.error("No Affiliation organisation not found");
    return undefined;
  }

  // Ensure timestamp is set
  const timestamp = attestTimestamp || new Date();

  // Generate unique key
  const key = `NO_AFFILIATION${attestor.id}`;

  const newAttestorOrganisation = new AttestorOrganisation({
    id: key,
    attestor,
    organisation,
    attestTimestamp: timestamp,
  });

  try {
    await ctx.store.upsert(newAttestorOrganisation);
    ctx.log.debug(
      `Created new attestorOrganisation: ${newAttestorOrganisation}`
    );
  } catch (error) {
    ctx.log.error(`Error upserting attestorOrganisation: ${error}`);
    return undefined;
  }

  return newAttestorOrganisation;
};
