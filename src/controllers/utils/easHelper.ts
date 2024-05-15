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
  decodedData: SchemaDecodedItem[];
  refUID: string;
}> => {
  const easContract = new EASContract.Contract(
    ctx,
    block,
    EAS_CONTRACT_ADDRESS
  );

  const { data, refUID } = await easContract.getAttestation(attestationUid);
  const schemaEncoder = await getEasSchemaEncoder(ctx, block, schemaUid);

  const decodedData = schemaEncoder.decodeData(data);
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
