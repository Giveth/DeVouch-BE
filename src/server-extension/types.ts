import { Field, ObjectType, ID, Int } from "type-graphql";

export enum EProjectSort {
  HIGHEST_VOUCH_COUNT = "totalVouches_DESC",
  LOWEST_VOUCH_COUNT = "totalVouches_ASC",
  HIGHEST_FLAG = "totalFlags_DESC",
  LOWEST_FLAG = "totalFlags_ASC",
}
@ObjectType()
export class ProjectsSortedByVouchOrFlagType {
  @Field(() => ID)
  id!: string;
}

@ObjectType()
export class VouchCountResult {
  @Field()
  total: number = 0;

  @Field(() => [VouchCountPerMonth])
  totalPerMonth: VouchCountPerMonth[] = [];
}

@ObjectType()
export class VouchCountPerMonth {
  @Field()
  month: string = "";

  @Field()
  count: number = 0;
}
