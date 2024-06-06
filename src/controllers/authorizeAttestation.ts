import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import { Attestor, AttestorOrganisation, Organisation } from "../model";
import * as EASContract from "../abi/EAS";
import { getAttestor } from "./utils/modelHelper";

export const handleAuthorize = async (
  ctx: DataHandlerContext<Store>,
  log: Log
) => {
  const {
    uid,
    schema: schemaUid,
    attestor: issuer,
    recipient,
  } = EASContract.events.Attested.decode(log);

  const organisationId = schemaUid.toLocaleLowerCase();
  const organisation = await ctx.store.findOneBy(Organisation, {
    id: organisationId,
    issuer: issuer.toLocaleLowerCase(),
  });

  if (!organisation) return; // No organisation found for this schema

  ctx.log.debug(`Processing authorize attestation with uid: ${uid}`);

  const accountAddress = recipient.toLocaleLowerCase();

  if (!accountAddress) {
    ctx.log.error(`Account address not found for on attestation ${uid}`);
    return;
  }

  const attestor = await getAttestor(ctx, accountAddress);

  const key = `${organisationId}-${accountAddress}`;

  let attestorOrganisation: AttestorOrganisation = new AttestorOrganisation({
    id: key,
    attestor,
    organisation,
    attestTimestamp: new Date(log.block.timestamp),
  });

  ctx.store.upsert(attestorOrganisation);

  ctx.log.debug(
    `Attestor ${accountAddress} authorized for organisation ${
      organisation.name
    }: ${JSON.stringify(attestorOrganisation)}`
  );
};

export const handleAuthorizeRevoke = async (
  ctx: DataHandlerContext<Store>,
  uid: string
) => {
  const attestation = await ctx.store.findOne(AttestorOrganisation, {
    where: {
      id: uid.toLocaleLowerCase(),
    },
  });

  if (!attestation) {
    return;
  }

  await ctx.store.remove(attestation);
  ctx.log.debug(`Revoked authorize attestation ${attestation}`);
};
