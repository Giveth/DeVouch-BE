import { DataHandlerContext } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import { assert } from "console";
import { EntityManager } from "typeorm/entity-manager/EntityManager";

export const getEntityManger = (
  ctx: DataHandlerContext<Store>
): EntityManager => {
  const em = (ctx.store as unknown as { em: () => EntityManager }).em();
  assert(em, "EntityManager not found in store");
  return em;
};
