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

  @Field()
  totalWithComments: number = 0;

  @Field(() => [VouchCountPerMonth])
  totalPerMonth: VouchCountPerMonth[] = [];
}

@ObjectType()
export class VouchCountPerMonth {
  @Field()
  date: string = "";

  @Field()
  totalCount: number = 0;

  @Field()
  countWithComments: number = 0;

  @Field()
  countWithoutComments: number = 0;
}

@ObjectType()
export class VouchCountByUser {
  @Field()
  userId: string = "";

  @Field(() => Int)
  totalCount: number = 0;
}

@ObjectType()
export class VouchCountByUserResult {
  @Field(() => Int)
  totalUsers: number = 0;

  @Field(() => [VouchCountByUser])
  vouchCountByUser: VouchCountByUser[] = [];
}
