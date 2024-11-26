import { assertNotNull } from "@subsquid/util-internal";
import {
  BlockHeader,
  DataHandlerContext,
  EvmBatchProcessor,
  EvmBatchProcessorFields,
  Log as _Log,
  Transaction as _Transaction,
} from "@subsquid/evm-processor";

import * as EASContract from "./abi/EAS";
import { EAS_CONTRACT_ADDRESS, LOOKUP_ARCHIVE, START_BLOCK } from "./constants";
import { getEntityManagerByConnection } from "./controllers/utils/databaseHelper";
import { Organisation } from "./model";

export class Processor {
  private static instance: EvmBatchProcessor;

  static async getInstance(): Promise<EvmBatchProcessor> {
    if (!Processor.instance) {
      const em = await getEntityManagerByConnection();
      const result = await em
        .getRepository(Organisation)
        .query(
          "select min(start_block) as start_block from organisation where start_block is not null"
        );

      let startBlock = Math.min(
        result[0].start_block || Number.MAX_SAFE_INTEGER,
        START_BLOCK
      );

      console.log("############################");
      if (result[0].start_block) {
        console.log("Default start block: " + START_BLOCK);
        console.log("Start block from DB: " + result[0].start_block);
      }
      console.log("Subsquid config start block: " + startBlock);
      console.log("############################");

      const start_block = Math.min(
        result[0].start_block || Number.MAX_SAFE_INTEGER,
        START_BLOCK
      );

      console.log("result", result);

      Processor.instance = new EvmBatchProcessor()
        // Lookup archive by the network name in Subsquid registry
        // See https://docs.subsquid.io/evm-indexing/supported-networks/
        .setGateway(LOOKUP_ARCHIVE)
        // Chain RPC endpoint is required for
        //  - indexing unfinalized blocks https://docs.subsquid.io/basics/unfinalized-blocks/
        //  - querying the contract state https://docs.subsquid.io/evm-indexing/query-state/
        .setRpcEndpoint({
          // Set the URL via .env for local runs or via secrets when deploying to Subsquid Cloud
          // https://docs.subsquid.io/deploy-squid/env-variables/
          url: assertNotNull(process.env.RPC_ENDPOINT),
          // More RPC connection options at https://docs.subsquid.io/evm-indexing/configuration/initialization/#set-data-source
          rateLimit: 10,
        })
        .setRpcDataIngestionSettings({
          disabled: process.env.RPC_DATA_INGESTION_DISABLED === "true",
        })
        .setFinalityConfirmation(1)
        .setFields({
          log: {
            topics: true,
            data: true,
            transactionHash: true,
          },
        })
        .setBlockRange({
          from: start_block,
        })
        .addLog({
          address: [EAS_CONTRACT_ADDRESS],
          topic0: [
            EASContract.events.Attested.topic,
            EASContract.events.Revoked.topic,
          ],
          transaction: true,
        });
    }
    return Processor.instance;
  }
}
export type Fields = EvmBatchProcessorFields<typeof EvmBatchProcessor>;
export type Block = BlockHeader<Fields>;
export type Log = _Log<Fields>;
export type Transaction = _Transaction<Fields>;
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>;
