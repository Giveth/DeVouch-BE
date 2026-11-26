import {
  SchemaDecodedItem,
  SchemaEncoder,
} from "@ethereum-attestation-service/eas-sdk";
import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as EASContract from "../../abi/EAS";
import * as SchemaContract from "../../abi/Schema";
import { EAS_CONTRACT_ADDRESS, SCHEMA_CONTRACT_ADDRESS } from "../../constants";
import { Block } from "../../abi/abi.support";
import {
  Attestor,
  AttestorOrganisation,
  Organisation,
  Project,
  ProjectAttestation,
} from "../../model";

export const getEasSchemaEncoder = async (
  ctx: DataHandlerContext<Store>,
  block: Block,
  schemaUid: string
): Promise<SchemaEncoder> => {
  const schemaContract = new SchemaContract.Contract(
    ctx,
    block,
    SCHEMA_CONTRACT_ADDRESS
  );

  const schema = await schemaContract.getSchema(schemaUid);
  return new SchemaEncoder(schema.schema);
};

export const getAttestationData = async (
  ctx: DataHandlerContext<Store>,
  block: Block,
  attestationUid: string,
  schemaUid: string
): Promise<{
  // Undefined when the attestation's data does not decode with its schema.
  decodedData: SchemaDecodedItem[] | undefined;
  refUID: string;
}> => {
  const easContract = new EASContract.Contract(
    ctx,
    block,
    EAS_CONTRACT_ADDRESS
  );

  const {
    uid: returnedUid,
    schema: returnedSchema,
    data,
    refUID,
  } = await easContract.getAttestation(attestationUid);

  // EAS answers an unknown uid with an all-zero attestation instead of
  // reverting. That, or any answer that is not the attestation the event
  // announced, is a fault of the node (lagging, wrong block), not of the
  // payload: throw so the batch is retried rather than the attestation lost.
  if (
    returnedUid.toLowerCase() !== attestationUid.toLowerCase() ||
    returnedSchema.toLowerCase() !== schemaUid.toLowerCase()
  ) {
    throw new Error(
      `EAS returned attestation ${returnedUid} with schema ${returnedSchema} for attestation ${attestationUid} with schema ${schemaUid}`
    );
  }

  const schemaEncoder = await getEasSchemaEncoder(ctx, block, schemaUid);

  // EAS does not check `data` against the schema, so anyone can attest with
  // bytes that do not decode. Only the decoding is guarded: it is pure, so
  // nothing but the payload can make it throw. The RPC calls above are not.
  let decodedData: SchemaDecodedItem[] | undefined;
  try {
    decodedData = schemaEncoder.decodeData(data);
  } catch {
    decodedData = undefined;
  }
  return {
    decodedData,
    refUID,
  };
};

export const removeDuplicateProjectAttestations = async (
  ctx: DataHandlerContext<Store>,
  project: Project,
  attestor: Attestor,
  organisation: Organisation
) => {
  const attestorOrganisations = await ctx.store.findBy(AttestorOrganisation, {
    attestor,
    organisation,
  });

  for (const attestorOrganisation of attestorOrganisations) {
    const projectAttestation = await ctx.store.findOneBy(ProjectAttestation, {
      project,
      attestorOrganisation,
    });

    if (projectAttestation) {
      ctx.log.debug(
        `Removing duplicate project attestation ${projectAttestation.id}`
      );
      await ctx.store.remove(projectAttestation);
    }
  }
};
