import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import { Attestor, AttestorOrganisation, Organisation } from "../model";
import * as EASContract from "../abi/EAS";
import { getAttestationData } from "./utils/easHelper";

export const handleAuthorize = async (
  ctx: DataHandlerContext<Store>,
  log: Log
) => {
  const {
    uid,
    schema: schemaUid,
    attestor: issuer,
  } = EASContract.events.Attested.decode(log);

  const organisation = await ctx.store.findOneBy(Organisation, {
    id: schemaUid.toLocaleLowerCase(),
    issuer: issuer.toLocaleLowerCase(),
  });

  if (!organisation) return; // No organisation found for this schema

  ctx.log.debug(`Processing authorize attestation with uid: ${uid}`);

  const decodedData = await getAttestationData(ctx, log.block, uid, schemaUid);

  const accountAddress = decodedData
    .find((i) => i.name === organisation.schemaUserField)
    ?.value.value.toString()
    .toLocaleLowerCase();

  if (!accountAddress) {
    ctx.log.error(`Account address not found for on attestation ${uid}`);
    return;
  }

  const attestor = new Attestor({ id: accountAddress });
  await ctx.store.upsert([attestor]);

  const key = `${accountAddress}-${organisation.id}`;

  let attestorOrganisation: AttestorOrganisation = new AttestorOrganisation({
    id: key,
    attestor,
    organisation,
    uid,
    revoked: false,
    attestTimestamp: new Date(log.block.timestamp),
  });

  ctx.store.upsert(attestorOrganisation);

  ctx.log.debug(
    `Attestor ${accountAddress} authorized for organisation ${organisation.name}: ${attestorOrganisation}`
  );
};
