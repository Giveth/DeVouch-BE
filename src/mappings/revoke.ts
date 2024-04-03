import { DataHandlerContext, Log } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";

export async function processRevokeLog(
  ctx: DataHandlerContext<Store>,
  log: Log
): Promise<void> {}
