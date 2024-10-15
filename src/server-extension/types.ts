import { Field, ObjectType, ID, Int } from "type-graphql";

@ObjectType()
export class ProjectsSortedByVouchOrFlagType {
  @Field(() => ID)
  id!: string;
}
