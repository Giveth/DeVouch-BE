import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import { ProjectVerificationAttestation } from "./easTypes";
import { SchemaDecodedItem } from "@ethereum-attestation-service/eas-sdk";
import { SafeParseReturnType } from "zod";
import { Attestor, AttestorOrganisation, Organisation } from "../../model";

export const checkProjectAttestation = async (
  ctx: DataHandlerContext<Store>,
  attestorGroup: string,
  issuer: string
): Promise<AttestorOrganisation | undefined> => {
  const organisation = await ctx.store.findOneBy(Organisation, {
    id: attestorGroup.toLocaleLowerCase(),
  });

  if (!organisation) {
    ctx.log.debug(
      `Organisation not found for schemaUid: ${attestorGroup} in project verification attestation - skipped`
    );
    return;
  }

  const attestor = await ctx.store.findOneBy(Attestor, {
    id: issuer.toLocaleLowerCase(),
  });

  if (!attestor) {
    ctx.log.debug(
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

export const parseAttestationData = (
  decodedData: SchemaDecodedItem[]
): SafeParseReturnType<any, ProjectVerificationAttestation> => {
  console.log("decodedData:", decodedData);
  let vouch: boolean;
  let projectSource: string;
  let projectId: string;
  let attestorGroup: string;
  let comment: string;

  for (const item of decodedData) {
    const value = item.value.value;
    switch (item.name) {
      case "vouch":
        vouch = value as boolean;
        break;
      case "projectSource":
        projectSource = value as string;
        break;
      case "projectId":
        projectId = value as string;
        break;
      case "attestorGroup":
        attestorGroup = value as string;
        break;
      case "comment":
        comment = value as string;
        break;
    }
  }

  const projectVerificationAttestation: ProjectVerificationAttestation = {
    // @ts-ignore
    vouch,
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
