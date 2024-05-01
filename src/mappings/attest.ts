import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as EASContract from "../abi/EAS";
import * as SchemaContract from "../abi/Schema";

import {
  PROJECT_VERIFY_SCHEMA,
  EAS_CONTRACT_ADDRESS,
  SCHEMA_CONTRACT_ADDRESS,
} from "../constants";
import { handleAuthorize } from "../controllers/authorizeAttestation";
import { handleProjectAttestation } from "../controllers/projectVerificationAttestation";

export async function processAttest(
  ctx: DataHandlerContext<Store>,
  log: Log
): Promise<void> {
  const { schema: schemaUid } = EASContract.events.Attested.decode(log);
  switch (schemaUid.toLocaleLowerCase()) {
    case PROJECT_VERIFY_SCHEMA:
      await handleProjectAttestation(ctx, log);
      break;

    default:
      await handleAuthorize(ctx, log);
  }
}
