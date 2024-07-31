import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as EASContract from "../abi/EAS";
import { PROJECT_VERIFY_SCHEMA } from "../constants";
import { handleProjectAttestationRevoke } from "../controllers/projectVerificationAttestation";
import { handleAuthorizeRevoke } from "../controllers/authorizeAttestation";

export async function processRevokeLog(
  ctx: DataHandlerContext<Store>,
  log: Log
): Promise<void> {
  const { uid, schema: schemaUid } = EASContract.events.Revoked.decode(log);

  if (PROJECT_VERIFY_SCHEMA.has(schemaUid.toLocaleLowerCase())) {
    await handleProjectAttestationRevoke(ctx, uid);
    return;
  }
  await handleAuthorizeRevoke(ctx, uid);
}
