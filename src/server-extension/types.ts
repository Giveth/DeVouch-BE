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
