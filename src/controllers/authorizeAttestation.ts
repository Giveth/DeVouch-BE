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
    schemaUid: schemaUid.toLocaleLowerCase(),
    issuer: issuer.toLocaleLowerCase(),
  });

  if (!organisation) return; // No organisation found for this schema

  const decodedData = await getAttestationData(ctx, log.block, uid, schemaUid);

  console.log("Decoded data:", decodedData);

  const accountAddress = decodedData
    .find((i) => i.name === organisation.schemaUserField)
    ?.value.value.toString()
    .toLocaleLowerCase();

  if (!accountAddress) {
    ctx.log.error(`Account address not found for on attestation ${uid}`);
    return;
  }

  let attestor = await ctx.store.get(Attestor, accountAddress);

  if (!attestor) {
    attestor = new Attestor({ id: accountAddress });
    await ctx.store.upsert([attestor]);
  }

  await ctx.store.upsert([
    new AttestorOrganisation({
      id: uid,
      attestor,
      organisation,
      revoked: false,
      attestTimestamp: new Date(log.block.timestamp * 1000),
    }),
  ]);
};
