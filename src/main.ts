import { TypeormDatabase } from "@subsquid/typeorm-store";
import { processor } from "./processor";
import * as EASContract from "./abi/EAS";
import { processAttest } from "./mappings/attest";
import { processRevokeLog } from "./mappings/revoke";
import { importProjects } from "./features/import-projects/index";

processor.run(new TypeormDatabase({ supportHotBlocks: false }), async (ctx) => {
  for (let _block of ctx.blocks) {
    for (let _log of _block.logs) {
      switch (_log.topics[0]) {
        case EASContract.events.Attested.topic:
          await processAttest(ctx, _log);
          break;

        case EASContract.events.Revoked.topic:
          await processRevokeLog(ctx, _log);
      }
    }
  }
});

importProjects();
