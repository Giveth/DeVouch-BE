import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as EASContract from "../abi/EAS";

import { PROJECT_VERIFY_SCHEMA } from "../constants";
import { handleAuthorize } from "../controllers/authorizeAttestation";
import { handleProjectAttestation } from "../controllers/projectVerificationAttestation";

export async function processAttest(
  ctx: DataHandlerContext<Store>,
  log: Log
): Promise<void> {
  const { schema: schemaUid } = EASContract.events.Attested.decode(log);

  if (PROJECT_VERIFY_SCHEMA.has(schemaUid.toLocaleLowerCase())) {
    await handleProjectAttestation(ctx, log);
    return;
  }
  await handleAuthorize(ctx, log);
}
