import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as EASContract from "../abi/EAS";
import {
  getAttestationData,
  removeDuplicateProjectAttestations,
} from "./utils/easHelper";
import { AttestorOrganisation, ProjectAttestation } from "../model";
import {
  getProject,
  updateProjectAttestationCounts,
} from "./utils/modelHelper";
import { parseAttestationData } from "./utils/projectVerificationHelper";

export const handleProjectAttestation = async (
  ctx: DataHandlerContext<Store>,
  log: Log
): Promise<void> => {
  const {
    uid,
    schema: schemaUid,
    attestor: issuer,
    recipient,
  } = EASContract.events.Attested.decode(log);

  const { decodedData, refUID } = await getAttestationData(
    ctx,
    log.block,
    uid,
    schemaUid
  );

  const attestorOrganisation = await ctx.store.get(AttestorOrganisation, {
    where: {
      id: refUID.toLowerCase(),
    },
    relations: {
      organisation: true,
      attestor: true,
    },
  });

  if (!attestorOrganisation) {
    ctx.log.debug(
      `Attestor ${issuer} is not part of any organisation with ref UI ${refUID}`
    );
    return;
  }

  const { success, data: projectVerificationAttestation } =
    parseAttestationData(decodedData);

  if (!success) {
    ctx.log.error(`Error parsing project verification attestation
    uid: ${uid}
    schemaUid: ${schemaUid}
    issuer: ${issuer}
    decodedData: ${JSON.stringify(decodedData)}
    projectVerificationAttestation: ${projectVerificationAttestation} 
    `);
    throw new Error("Error parsing project verification attestation");
  }

  ctx.log.debug(`Processing project attestation with uid: ${uid}`);

  const project = await getProject(
    ctx,
    projectVerificationAttestation.projectSource,
    projectVerificationAttestation.projectId
  );

  // Delete the previous attestation
  await removeDuplicateProjectAttestations(
    ctx,
    project,
    attestorOrganisation.attestor,
    attestorOrganisation.organisation
  );

  const { vouch, comment } = projectVerificationAttestation;
  const projectAttestation = new ProjectAttestation({
    id: uid,
    vouch,
    txHash: log.getTransaction().hash,
    project,
    attestorOrganisation,
    comment,
    attestTimestamp: new Date(log.block.timestamp),
    recipient,
  });

  await ctx.store.upsert(projectAttestation);
  ctx.log.debug(
    `Upserted project attestation ${JSON.stringify(projectAttestation)}`
  );

  await updateProjectAttestationCounts(ctx, project);
};

export const handleProjectAttestationRevoke = async (
  ctx: DataHandlerContext<Store>,
  uid: string
) => {
  const attestation = await ctx.store.findOne(ProjectAttestation, {
    relations: {
      project: true,
    },
    where: {
      id: uid,
    },
  });

  ctx.log.debug(`Processing project attestation revokation with uid: ${uid}`);
  if (!attestation) {
    ctx.log.debug(`Project attestation not found for uid: ${uid}`);
    return;
  }

  await ctx.store.remove(attestation);
  ctx.log.debug(`Revoked project attestation ${JSON.stringify(attestation)}`);

  await updateProjectAttestationCounts(ctx, attestation.project);
};
