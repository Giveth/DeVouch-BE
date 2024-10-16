import {
  BlockHeader,
  DataHandlerContext,
  EvmBatchProcessor,
  EvmBatchProcessorFields,
  Log as _Log,
  Transaction as _Transaction,
} from "@subsquid/evm-processor";
import { TypeormDatabase } from "@subsquid/typeorm-store";
import dotenv from "dotenv";

dotenv.config({
  path: ".env.test",
});
export const processor = new EvmBatchProcessor()
  // Lookup archive by the network name in Subsquid registry
  // See https://docs.subsquid.io/evm-indexing/supported-networks/
  .setGateway("https://v2.archive.subsquid.io/network/ethereum-sepolia")
  .addLog({});

export type Fields = EvmBatchProcessorFields<typeof processor>;
export type Block = BlockHeader<Fields>;
export type Log = _Log<Fields>;
export type Transaction = _Transaction<Fields>;
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>;

// processor.run(new TypeormDatabase({ supportHotBlocks: true }), async () => {
//   console.log("Test processor is running");
// });
