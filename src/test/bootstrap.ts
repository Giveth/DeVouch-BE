import { assertNotNull } from "@subsquid/util-internal";
import { lookupArchive } from "@subsquid/archive-registry";
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
import { EAS_CONTRACT_ADDRESS } from "../constants";
import * as EASContract from "./../abi/EAS";

dotenv.config({
  path: ".env.test",
});
export const processor = new EvmBatchProcessor()
  // Lookup archive by the network name in Subsquid registry
  // See https://docs.subsquid.io/evm-indexing/supported-networks/
  .setGateway(lookupArchive("eth-sepolia"))
  .addLog({});

export type Fields = EvmBatchProcessorFields<typeof processor>;
export type Block = BlockHeader<Fields>;
export type Log = _Log<Fields>;
export type Transaction = _Transaction<Fields>;
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>;

processor.run(new TypeormDatabase({ supportHotBlocks: true }), async () => {});
