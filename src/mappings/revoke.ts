import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as EASContract from "../abi/EAS";
import { PROJECT_VERIFY_SCHEMA } from "../constants";
import { handleProjectAttestationRevoke } from "../controllers/projectVerificationAttestation";

export async function processRevokeLog(
  ctx: DataHandlerContext<Store>,
  log: Log
): Promise<void> {
  const { uid, schema: schemaUid } = EASContract.events.Revoked.decode(log);

  switch (schemaUid.toLocaleLowerCase()) {
    case PROJECT_VERIFY_SCHEMA:
      await handleProjectAttestationRevoke(ctx, uid);
      break;

    default:
  }
}
