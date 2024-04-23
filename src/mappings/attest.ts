import {
  DataHandlerContext,
  Log,
  assertNotNull,
} from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as EASContract from "../abi/EAS";
import * as SchemaContract from "../abi/Schema";
import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";

import {
  PROJECT_VERIFY_SCHEMA,
  PROJECT_GIVBACK_ELIGIBLE_SCHEMA,
  EAS_CONTRACT_ADDRESS,
  SCHEMA_CONTRACT_ADDRESS,
} from "../constants";
import { Attester, Organisation, AttesterOrganisation } from "../model";

export async function processAttest(
  ctx: DataHandlerContext<Store>,
  log: Log
): Promise<void> {
  const {
    uid,
    schema: schemaUid,
    attester: issuer,
  } = EASContract.events.Attested.decode(log);
  const easContract = new EASContract.Contract(
    ctx,
    log.block,
    EAS_CONTRACT_ADDRESS
  );
  const schemaContract = new SchemaContract.Contract(
    ctx,
    log.block,
    SCHEMA_CONTRACT_ADDRESS
  );

  switch (schemaUid.toLocaleLowerCase()) {
    case PROJECT_VERIFY_SCHEMA:
      break;

    case PROJECT_GIVBACK_ELIGIBLE_SCHEMA:
      break;

    default:
      const organisation = await ctx.store.findOneBy(Organisation, {
        schemaUid: schemaUid.toLocaleLowerCase(),
        issuer: issuer.toLocaleLowerCase(),
      });

      if (!organisation) break;
      const { data } = await easContract.getAttestation(uid);
      const schema = await schemaContract.getSchema(schemaUid);
      const schemaEncoder = new SchemaEncoder(schema.schema);
      const decodedData = schemaEncoder.decodeData(data);
      console.log("Decoded data:", decodedData);
      const accountAddress = decodedData
        .find((i) => i.name === organisation.schemaUserField)
        ?.value.value.toString()
        .toLocaleLowerCase();

      if (!accountAddress) {
        ctx.log.error(`Account address not found for on attestation ${uid}`);
        break;
      }

      let attester = await ctx.store.get(Attester, accountAddress);

      if (!attester) {
        attester = new Attester({ id: accountAddress });
        await ctx.store.upsert([attester]);
      }

      await ctx.store.upsert([
        new AttesterOrganisation({
          id: uid,
          attester,
          organisation,
          revoked: false,
          attestTimestamp: new Date(log.block.timestamp * 1000),
        }),
      ]);
  }
}
