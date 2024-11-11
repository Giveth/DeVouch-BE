import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class AttestorsTotalCountResult {
  @Field()
  totalCount: number = 0;
}
