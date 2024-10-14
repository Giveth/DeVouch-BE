import { Field, ID, Int, ObjectType } from "type-graphql";

@ObjectType()
export class ProjectType {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true }) // Allowing null or undefined
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int)
  totalVouches!: number;

  @Field(() => Int)
  totalFlags!: number;

  @Field(() => Int)
  totalAttests!: number;

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  image?: string;
}
