import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import { ProjectVerificationAttestation } from "./types";
import { SchemaDecodedItem } from "@ethereum-attestation-service/eas-sdk";
import { ZodSafeParseResult } from "zod";
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

// Longest project key (`<source>-<projectId>`, built by getProject), in UTF-8
// bytes, that every index it ends up in can hold.
//
// PostgreSQL refuses a B-tree index entry above 2704 bytes, header included.
// Measured on PostgreSQL 14, a text key that does not compress fits up to
// 2692 bytes and fails at 2693. The tightest index is not the `project`
// primary key but the `organisation_project` one: upsertOrganisatoinProject
// builds that id as `<project key>-<organisation id>-vouch`, which is 73 bytes
// longer than the project key (two hyphens, a 66-character organisation id and
// "vouch"). At this limit the id is 2673 bytes, 19 below the ceiling.
//
// This assumes organisation ids stay 66 characters (schema UIDs) and the
// suffix keeps its shape. If either grows, this limit has to shrink with it.
export const MAX_PROJECT_KEY_BYTES = 2600;

// Why PostgreSQL could not store this attestation, or undefined if it can.
// EAS accepts any strings, so these are checked before anything is written.
export const getUnstorableReason = (
  attestation: ProjectVerificationAttestation
): string | undefined => {
  const { projectSource, projectId, comment } = attestation;

  // PostgreSQL text cannot hold the NUL character.
  for (const [name, value] of Object.entries({
    projectSource,
    projectId,
    comment,
  })) {
    if (value?.includes("\u0000")) return `${name} contains a NUL character`;
  }

  const projectKey = `${projectSource.toLocaleLowerCase()}-${projectId}`;
  if (Buffer.byteLength(projectKey, "utf8") > MAX_PROJECT_KEY_BYTES) {
    return `project key is longer than ${MAX_PROJECT_KEY_BYTES} bytes`;
  }
};

export const parseAttestationData = (
  decodedData: SchemaDecodedItem[]
): ZodSafeParseResult<ProjectVerificationAttestation> => {
  let vouch: boolean;
  let projectSource: string;
  let projectId: string;
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
    comment,
  };

  return ProjectVerificationAttestation.safeParse(
    projectVerificationAttestation
  );
};
