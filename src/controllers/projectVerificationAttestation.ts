import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as EASContract from "../abi/EAS";
import { getAttestationData } from "./utils/easHelper";
import { ProjectVerificationAttestation } from "./utils/easTypes";
import { SchemaDecodedItem } from "@ethereum-attestation-service/eas-sdk";
import { SafeParseReturnType } from "zod";
import {
  Attestor,
  AttestorOrganisation,
  Organisation,
  Project,
  ProjectAttestation,
} from "../model";
import { updateProjectAttestationCounts } from "./utils/modelHelper";

export const projectVeriricationAttestation = async (
  ctx: DataHandlerContext<Store>,
  log: Log
): Promise<void> => {
  const {
    uid,
    schema: schemaUid,
    attestor: issuer,
  } = EASContract.events.Attested.decode(log);

  const decodedData = await getAttestationData(ctx, log.block, uid, schemaUid);

  const { success, data: projectVerificationAttestation } =
    parseData(decodedData);

  if (!success) {
    ctx.log.error(`Error parsing project verification attestation
    uid: ${uid}
    schemaUid: ${schemaUid}
    issuer: ${issuer}
    decodedData: ${decodedData}
    `);
    return;
  }

  console.log(
    "Project Verification Attestation:",
    projectVerificationAttestation
  );

  for (const attestorGroup of projectVerificationAttestation.attestorGroup) {
    // Check if the attestor is part of the organisation
    const attestorOrganisation = await verifyAttestation(
      ctx,
      attestorGroup,
      issuer
    );

    console.log("attestorOrganisation: ", attestorOrganisation);

    if (!attestorOrganisation) {
      ctx.log.info(
        `Attestor ${issuer} is not part of the organisation ${attestorGroup} in project verification attestation - skipped`
      );
      break;
    }
    const project = await getProject(
      ctx,
      projectVerificationAttestation.projectSource,
      projectVerificationAttestation.projectId
    );

    // Delete the previous attestation
    const oldAttestation = await ctx.store.findOneBy(ProjectAttestation, {
      project,
      attestorOrganisation,
    });
    if (oldAttestation) {
      await ctx.store.remove(oldAttestation);
    }

    const { vouchOrFlag, comment } = projectVerificationAttestation;

    await ctx.store.upsert(
      new ProjectAttestation({
        id: uid,
        vouchOrFlag,
        txHash: log.getTransaction().hash,
        project,
        attestorOrganisation,
        comment: comment,
        attestTimestamp: new Date(log.block.timestamp),
        revoked: false,
      })
    );
    updateProjectAttestationCounts(ctx, project);
  }
};

const getProject = async (
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
        lastUpdatedTimestamp: new Date(),
      })
    );
    project = await ctx.store.findOneBy(Project, { id });
  }

  return project as Project;
};
const verifyAttestation = async (
  ctx: DataHandlerContext<Store>,
  attestorGroup: string,
  issuer: string
): Promise<AttestorOrganisation | undefined> => {
  const organisation = await ctx.store.findOneBy(Organisation, {
    schemaUid: attestorGroup.toLocaleLowerCase(),
  });

  if (!organisation) {
    ctx.log.info(
      `Organisation not found for schemaUid: ${attestorGroup} in project verification attestation - skipped`
    );
    return;
  }

  const attestor = await ctx.store.findOneBy(Attestor, {
    id: issuer.toLocaleLowerCase(),
  });

  if (!attestor) {
    ctx.log.info(
      `Attestor not found for issuer: ${issuer} in project verification attestation - skipped`
    );
    return;
  }

  // Check if the attestor is part of the organisation
  const attestorOrganisation = await ctx.store.findOneBy(AttestorOrganisation, {
    attestor,
    organisation,
  });

  return attestorOrganisation;
};

const parseData = (
  decodedData: SchemaDecodedItem[]
): SafeParseReturnType<any, ProjectVerificationAttestation> => {
  let vouchOrFlag: boolean;
  let projectSource: string;
  let projectId: string;
  let attestorGroup: string[];
  let comment: string;

  for (const item of decodedData) {
    const value = item.value.value;
    switch (item.name) {
      case "vouchOrFlag":
        vouchOrFlag = value as boolean;
        break;
      case "projectSource":
        projectSource = value as string;
        break;
      case "projectId":
        projectId = value as string;
        break;
      case "attestorGroup":
        attestorGroup = Object.values(value).map((v) => v.toString());
        break;
      case "comment":
        comment = value as string;
        break;
    }
  }

  const projectVerificationAttestation: ProjectVerificationAttestation = {
    // @ts-ignore
    vouchOrFlag,
    // @ts-ignore
    projectSource,
    // @ts-ignore
    projectId,
    // @ts-ignore
    attestorGroup,
    // @ts-ignore
    comment,
  };

  return ProjectVerificationAttestation.safeParse(
    projectVerificationAttestation
  );
};
